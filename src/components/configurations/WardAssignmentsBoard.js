// WardAssignmentsBoard.js
// Lives at: src/components/configurations/WardAssignmentsBoard.js
// Route:    /ward_assignments_board
//
// Shows a paginated board of all active ward assignments (pending + admitted).
// Staff can assign a bed to any pending assignment from this screen.
//
// Endpoints used:
//   GET  /visitAssign/wards/all-assignments   – paginated board data
//   GET  /visitAssign/wards/bed-availability  – available beds for a ward
//   POST /visitAssign/wards/assign-bed        – assign a bed to a ward assignment
//   GET  /config/getDepartments               – (unused here, wards come from data)
//   GET  /config/getWards  (via fetchWardsData helper)  – ward filter list

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Select from 'react-select';
import {
    BedDouble, CheckCircle2, Loader2, AlertCircle, X,
    Calendar, RefreshCw, Filter, ChevronLeft, ChevronRight,
    User, Clock, Building2, Hash, Info, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../general/constants';
import { getSelectClassNames } from '../general/searchSelectStyles';
import { fetchWardsData } from '../general/helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem('access_token');

const apiHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
});

const startOfMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const endOfMonth = () => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
};

const formatDate = (val) => {
    if (!val) return '—';
    try {
        return new Date(val).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return val;
    }
};

// ─── Status badge ──────────────────────────────────────────────────────────────

const AssignmentStatusBadge = ({ row }) => {
    const hasBed   = !!row.bed;
    const admitted = row.status === 'admitted';
    const pending  = row.status === 'pending';

    if (admitted && hasBed) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300
                border border-blue-200 dark:border-blue-800">
                <BedDouble className="w-3 h-3" />
                Admitted — Bed {row.bed.bed_number}
            </span>
        );
    }

    if (pending && !hasBed) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300
                border border-amber-200 dark:border-amber-800">
                <Clock className="w-3 h-3" />
                Awaiting Bed
            </span>
        );
    }

    // fallback — admitted but no bed_id set yet (should not happen after proper use)
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
            bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300
            border border-gray-200 dark:border-gray-700">
            {row.status}
        </span>
    );
};

// ─── Bed selection card ────────────────────────────────────────────────────────

const BedCard = ({ bed, selected, onSelect }) => (
    <button
        type="button"
        onClick={() => onSelect(bed)}
        className={`
            w-full text-left p-4 rounded-xl border-2 transition-all relative
            ${selected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
            }
        `}
    >
        {selected && (
            <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-blue-500" />
        )}
        <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                ${selected
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                }`}>
                <BedDouble className="w-4 h-4" />
            </div>
            <div>
                <p className={`font-bold text-sm ${selected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100'}`}>
                    Bed {bed.bed_number}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Available</p>
            </div>
        </div>
    </button>
);

// ─── Assign Bed Drawer ─────────────────────────────────────────────────────────

function AssignBedDrawer({ isOpen, onClose, assignment, onSuccess }) {
    const [beds, setBeds]           = useState([]);
    const [loadingBeds, setLoadingBeds] = useState(false);
    const [bedStats, setBedStats]   = useState(null);
    const [selectedBed, setSelectedBed] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen || !assignment) return;
        setSelectedBed(null);
        setBeds([]);
        setBedStats(null);

        const load = async () => {
            setLoadingBeds(true);
            try {
                const res = await axios.get(
                    `${API_BASE_URL}visitAssign/wards/bed-availability`,
                    { params: { ward_id: assignment.ward?.id }, headers: apiHeaders() }
                );
                const d = res.data?.data ?? {};
                setBedStats({
                    total:       d.total       ?? 0,
                    available:   d.available   ?? 0,
                    occupied:    d.occupied    ?? 0,
                    maintenance: d.maintenance ?? 0,
                });
                setBeds(d.available_beds ?? []);
            } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to load bed availability');
            } finally {
                setLoadingBeds(false);
            }
        };
        load();
    }, [isOpen, assignment]);

    const handleAssign = async () => {
        if (!selectedBed) {
            toast.error('Please select a bed first');
            return;
        }
        setSubmitting(true);
        try {
            const res = await axios.post(
                `${API_BASE_URL}visitAssign/wards/assign-bed`,
                { patient_visit_ward_id: assignment.id, bed_id: selectedBed.id },
                { headers: apiHeaders() }
            );
            toast.success(`Bed ${selectedBed.bed_number} assigned successfully`);
            onSuccess?.(res.data?.data ?? res.data);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to assign bed');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const patient = assignment?.visit?.patient;
    const ward    = assignment?.ward;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-xl z-50 flex flex-col
                bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800
                animate-slide-in-right">

                {/* Header */}
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800
                    bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <BedDouble className="w-5 h-5" />
                            Assign Bed
                        </h2>
                        <p className="text-blue-100 text-xs mt-1">
                            {patient?.name && <>{patient.name} &mdash; </>}
                            {assignment?.visit?.visit_number && (
                                <span className="font-semibold">{assignment.visit.visit_number}</span>
                            )}
                        </p>
                        {ward && (
                            <p className="text-blue-200 text-xs mt-0.5 flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {ward.name}
                                {ward.branch?.name && <> &bull; {ward.branch.name}</>}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-white/20 text-white transition mt-0.5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            Select an available bed below. Once assigned, the bed will be marked as occupied and the patient will be recorded as admitted.
                        </p>
                    </div>

                    {/* Bed stats row */}
                    {bedStats && (
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Total',       val: bedStats.total,       cls: 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
                                { label: 'Available',   val: bedStats.available,   cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
                                { label: 'Occupied',    val: bedStats.occupied,    cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
                            ].map(({ label, val, cls }) => (
                                <div key={label} className={`rounded-xl border p-3 text-center ${cls}`}>
                                    <p className="text-lg font-bold">{val}</p>
                                    <p className="text-xs font-medium mt-0.5">{label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bed list */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <BedDouble className="w-4 h-4 text-blue-500" />
                                Available Beds <span className="text-red-500">*</span>
                            </p>
                            {!loadingBeds && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {beds.length} available
                                </span>
                            )}
                        </div>

                        {loadingBeds ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-4 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
                                                <div className="h-3 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : beds.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-10 text-center">
                                <BedDouble className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">No available beds in this ward</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    All beds are occupied or under maintenance
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {beds.map(bed => (
                                    <BedCard
                                        key={bed.id}
                                        bed={bed}
                                        selected={selectedBed?.id === bed.id}
                                        onSelect={setSelectedBed}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected summary */}
                    {selectedBed && (
                        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <p className="text-sm font-bold text-blue-700 dark:text-blue-300 flex-1">
                                Bed {selectedBed.bed_number} selected
                            </p>
                            <button
                                type="button"
                                onClick={() => setSelectedBed(null)}
                                className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-400 transition"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-900/80 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300
                            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                            hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleAssign}
                        disabled={submitting || !selectedBed || beds.length === 0}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white
                            bg-gradient-to-r from-blue-600 to-indigo-600
                            hover:from-blue-700 hover:to-indigo-700
                            disabled:opacity-40 disabled:cursor-not-allowed
                            transition shadow-lg shadow-blue-200 dark:shadow-blue-900/50"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning…</>
                            : <><BedDouble className="w-4 h-4" /> Assign Bed <ChevronRightIcon className="w-4 h-4" /></>
                        }
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                .animate-slide-in-right { animation: slideInRight 0.25s ease-out forwards; }
            `}</style>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WardAssignmentsBoard
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_OPTIONS = [
    { value: '',         label: 'All active (pending + admitted)' },
    { value: 'pending',  label: 'Awaiting Bed (pending)'          },
    { value: 'admitted', label: 'Admitted'                        },
];

export default function WardAssignmentsBoard() {
    // ── filters ──
    const [wardOptions, setWardOptions]   = useState([]);
    const [selectedWard, setSelectedWard] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(STATUS_OPTIONS[0]);
    const [dateFrom, setDateFrom] = useState(startOfMonth());
    const [dateTo,   setDateTo]   = useState(endOfMonth());

    // ── data ──
    const [rows, setRows]             = useState([]);
    const [loading, setLoading]       = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages]   = useState(1);
    const [totalItems, setTotalItems]   = useState(0);

    // ── drawer ──
    const [drawerOpen, setDrawerOpen]       = useState(false);
    const [activeAssignment, setActiveAssignment] = useState(null);

    // ── load ward filter list ──
    useEffect(() => {
        fetchWardsData(getToken()).then(data => {
            if (!data) return;
            setWardOptions([
                { value: null, label: 'All wards' },
                ...data.map(w => ({ value: w.id, label: w.name })),
            ]);
        });
    }, []);

    // ── fetch board data ──
    const fetchData = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                per_page:  20,
                from_date: dateFrom,
                to_date:   dateTo,
            };
            if (selectedWard?.value)   params.ward_id = selectedWard.value;
            if (selectedStatus?.value) params.status  = selectedStatus.value;

            const res = await axios.get(
                `${API_BASE_URL}visitAssign/wards/all-assignments`,
                { params, headers: apiHeaders() }
            );

            const payload  = res.data?.data ?? res.data;
            const paginator = payload?.data ? payload : { data: payload, current_page: 1, last_page: 1, total: (payload ?? []).length };

            setRows(paginator.data ?? []);
            setCurrentPage(paginator.current_page ?? 1);
            setTotalPages(paginator.last_page ?? 1);
            setTotalItems(paginator.total ?? 0);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load ward assignments');
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, selectedWard, selectedStatus]);

    useEffect(() => {
        fetchData(1);
    }, [fetchData]);

    const handlePageChange = (page) => {
        if (page < 1 || page > totalPages) return;
        fetchData(page);
    };

    const handleBedAssigned = () => {
        fetchData(currentPage);
    };

    const openBedDrawer = (row) => {
        setActiveAssignment(row);
        setDrawerOpen(true);
    };

    // ── table skeleton ──
    const TableSkeleton = () => (
        <>
            {[1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="animate-pulse">
                    {[1, 2, 3, 4, 5].map(j => (
                        <td key={j} className="px-4 py-3">
                            <div className="h-4 rounded-full bg-gray-200 dark:bg-gray-700 w-3/4" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );

    return (
        <div className="p-6 space-y-6">

            {/* ── Page header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BedDouble className="w-5 h-5 text-blue-500" />
                        Ward Assignments Board
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Active ward assignments — pending and admitted patients
                    </p>
                </div>
                <button
                    onClick={() => fetchData(currentPage)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                        bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                        text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                        disabled:opacity-40 transition"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* ── Filter bar ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Ward */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ward</label>
                        <Select
                            options={wardOptions}
                            value={selectedWard ?? wardOptions[0]}
                            onChange={opt => setSelectedWard(opt?.value ? opt : null)}
                            classNames={getSelectClassNames()}
                            placeholder="All wards"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                        <Select
                            options={STATUS_OPTIONS}
                            value={selectedStatus}
                            onChange={opt => setSelectedStatus(opt ?? STATUS_OPTIONS[0])}
                            classNames={getSelectClassNames()}
                            placeholder="All active"
                        />
                    </div>

                    {/* From */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            <Calendar className="inline w-3 h-3 mr-1" />From
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-sm
                                bg-white dark:bg-gray-800 text-gray-800 dark:text-white
                                border border-gray-200 dark:border-gray-700
                                focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none
                                transition"
                        />
                    </div>

                    {/* To */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            <Calendar className="inline w-3 h-3 mr-1" />To
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-sm
                                bg-white dark:bg-gray-800 text-gray-800 dark:text-white
                                border border-gray-200 dark:border-gray-700
                                focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none
                                transition"
                        />
                    </div>
                </div>
            </div>

            {/* ── Table card ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">

                {/* Table header row */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {loading ? 'Loading…' : `${totalItems} assignment${totalItems !== 1 ? 's' : ''}`}
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/60 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Patient</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Visit #</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ward</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Assigned by</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <TableSkeleton />
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <BedDouble className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">No active assignments found</p>
                                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                                            Try adjusting the filters or date range
                                        </p>
                                    </td>
                                </tr>
                            ) : rows.map(row => {
                                const needsBed   = row.status === 'pending' && !row.bed;
                                const patient    = row.visit?.patient;
                                const assignedBy = row.assigned_by_user ?? row.assigned_by;

                                return (
                                    <tr
                                        key={row.id}
                                        className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40
                                            ${needsBed ? 'opacity-80' : ''}`}
                                    >
                                        {/* Patient */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">
                                                        {patient?.name ?? '—'}
                                                    </p>
                                                    {patient?.phone && (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">{patient.phone}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Visit # */}
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                                                {row.visit?.visit_number ?? '—'}
                                            </span>
                                        </td>

                                        {/* Ward */}
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-800 dark:text-gray-200 leading-tight">
                                                {row.ward?.name ?? '—'}
                                            </p>
                                            {row.ward?.branch?.name && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                    {row.ward.branch.name}
                                                </p>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <AssignmentStatusBadge row={row} />
                                            {row.admitted_at && (
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                                    Admitted {formatDate(row.admitted_at)}
                                                </p>
                                            )}
                                        </td>

                                        {/* Assigned by */}
                                        <td className="px-4 py-3">
                                            <p className="text-gray-700 dark:text-gray-300 text-xs">
                                                {assignedBy?.name ?? assignedBy?.username ?? '—'}
                                            </p>
                                        </td>

                                        {/* Date created */}
                                        <td className="px-4 py-3">
                                            <p className="text-gray-500 dark:text-gray-400 text-xs">
                                                {formatDate(row.created_at)}
                                            </p>
                                        </td>

                                        {/* Action */}
                                        <td className="px-4 py-3">
                                            {needsBed ? (
                                                <button
                                                    onClick={() => openBedDrawer(row)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                                                        bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                                                >
                                                    <BedDouble className="w-3.5 h-3.5" />
                                                    Assign Bed
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                                    {row.bed ? 'Bed assigned' : 'Admitted'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage <= 1 || loading}
                                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400
                                    hover:bg-gray-100 dark:hover:bg-gray-800
                                    disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let page;
                                if (totalPages <= 5) {
                                    page = i + 1;
                                } else if (currentPage <= 3) {
                                    page = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    page = totalPages - 4 + i;
                                } else {
                                    page = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        disabled={loading}
                                        className={`w-8 h-8 rounded-lg text-xs font-medium transition
                                            ${page === currentPage
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages || loading}
                                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400
                                    hover:bg-gray-100 dark:hover:bg-gray-800
                                    disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Assign Bed Drawer ── */}
            <AssignBedDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                assignment={activeAssignment}
                onSuccess={handleBedAssigned}
            />
        </div>
    );
}
