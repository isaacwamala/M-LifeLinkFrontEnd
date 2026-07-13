/**
 * DepartmentStaffing — Admin screen for managing which staff are assigned to
 * which departments, scoped by branch.
 *
 * WHERE IT LIVES
 * Route: /department_staffing  (registered in App.js alongside other
 * configuration screens like /doctor/rooms/assignments and /ward_manager)
 *
 * WHAT IT DOES
 * Two tabs:
 *  "By Department" — pick a department, see its active staff, add or remove
 *  "By User"       — pick a user, see every department they are active in, remove
 *
 * ENDPOINTS USED (all already built on the backend)
 *  GET  /config/getDepartments            — department list for selector
 *  GET  /getUsersDetails                    — user list for selector
 *  GET  /config/getBranches               — branch list for selector
 *  GET  /department-users/department-staff — staff in a department
 *  GET  /department-users/user-departments — departments for a user
 *  POST /department-users/assign          — create / reactivate an assignment
 *  POST /department-users/remove          — deactivate an assignment
 */

import { useState, useEffect, useCallback } from "react";
import Select from "react-select";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    Building2,
    Users,
    UserPlus,
    UserMinus,
    X,
    RefreshCw,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock,
    Star,
    Layers,
    UserCheck,
} from "lucide-react";

import { API_BASE_URL } from "../general/constants";
import { getSelectClassNames } from "../general/searchSelectStyles";
import {
    fetchDepartments,
    fetchActiveFacilityBranches,
    fetchAllDepartmentsForAdmin,
} from "../general/helpers";

// ── Helpers ──────────────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem("access_token") || "";

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-UG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const apiHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
});

// ── Small reusable pieces ─────────────────────────────────────────────────────

const PrimaryBadge = () => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Star className="w-3 h-3" /> Primary
    </span>
);

const StaffAvatar = ({ name }) => {
    const initials = name
        ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
        : "??";
    return (
        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-semibold text-sm flex-shrink-0 ring-2 ring-white dark:ring-gray-900">
            {initials}
        </div>
    );
};

// Inline confirm + remove button (same pattern as DoctorAssignRooms UnassignButton)
const RemoveButton = ({ assignmentId, onRemoved }) => {
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleRemove = async (e) => {
        e.stopPropagation();
        setLoading(true);
        try {
            const res = await axios.post(
                `${API_BASE_URL}department-users/remove`,
                { department_user_id: assignmentId },
                { headers: apiHeaders() }
            );
            if (res.data.success) {
                setDone(true);
                toast.success("Staff member removed from department.");
                setTimeout(() => onRemoved(), 800);
            } else {
                toast.error(res.data.message || "Failed to remove assignment.");
                setConfirming(false);
            }
        } catch (err) {
            toast.error(
                err?.response?.data?.message || "Something went wrong. Please try again."
            );
            setConfirming(false);
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Removed
            </span>
        );
    }

    if (confirming) {
        return (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Remove this assignment?
                </span>
                <button
                    onClick={handleRemove}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition disabled:opacity-60"
                >
                    {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <><UserMinus className="w-3.5 h-3.5" /> Yes, remove</>
                    )}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition"
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/30 transition"
        >
            <UserMinus className="w-3.5 h-3.5" />
            Remove
        </button>
    );
};

// ── Add Staff Drawer ──────────────────────────────────────────────────────────

const AddStaffDrawer = ({ open, onClose, departmentId, branches, users, onAssigned }) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [isPrimary, setIsPrimary] = useState(false);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [inlineError, setInlineError] = useState("");

    // Auto-select the only branch if there's just one
    useEffect(() => {
        if (open) {
            setSelectedUser(null);
            setIsPrimary(false);
            setNotes("");
            setInlineError("");
            if (branches.length === 1) {
                setSelectedBranch({ value: branches[0].id, label: branches[0].name });
            } else {
                setSelectedBranch(null);
            }
        }
    }, [open, branches]);

    const userOptions = users.map((u) => ({ value: u.id, label: u.name }));
    const branchOptions = branches.map((b) => ({ value: b.id, label: b.name }));
    const showBranchSelect = branches.length > 1;

    const handleSubmit = async () => {
        if (!selectedUser) {
            setInlineError("Please select a staff member.");
            return;
        }
        if (!selectedBranch) {
            setInlineError("Please select a branch.");
            return;
        }
        setLoading(true);
        setInlineError("");

        try {
            const res = await axios.post(
                `${API_BASE_URL}department-users/assign`,
                {
                    department_id: departmentId,
                    user_id: selectedUser.value,
                    branch_id: selectedBranch.value,
                    is_primary: isPrimary,
                    notes: notes.trim() || null,
                },
                { headers: apiHeaders() }
            );

            if (res.data.success) {
                toast.success("Staff member assigned successfully.");
                onAssigned();
                onClose();
            } else {
                setInlineError(res.data.message || "Assignment failed.");
            }
        } catch (err) {
            const status = err?.response?.status;
            const msg =
                err?.response?.data?.message ||
                "Something went wrong. Please try again.";
            // 409 = already active — show inline, not as generic failure
            if (status === 409) {
                setInlineError(msg);
            } else {
                setInlineError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/30 dark:bg-black/50 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />
            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Staff</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Assign a staff member to this department</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                    {/* User select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                            Staff Member <span className="text-red-500">*</span>
                        </label>
                        <Select
                            options={userOptions}
                            value={selectedUser}
                            onChange={setSelectedUser}
                            placeholder="Search by name…"
                            isClearable
                            classNames={getSelectClassNames()}
                        />
                    </div>

                    {/* Branch select — only shown when >1 branch */}
                    {showBranchSelect ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                Branch <span className="text-red-500">*</span>
                            </label>
                            <Select
                                options={branchOptions}
                                value={selectedBranch}
                                onChange={setSelectedBranch}
                                placeholder="Select branch…"
                                isClearable
                                classNames={getSelectClassNames()}
                            />
                        </div>
                    ) : (
                        selectedBranch && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Building2 className="w-4 h-4 flex-shrink-0" />
                                Branch: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedBranch.label}</span>
                            </div>
                        )
                    )}

                    {/* Primary checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative mt-0.5">
                            <input
                                type="checkbox"
                                checked={isPrimary}
                                onChange={(e) => setIsPrimary(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                            />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                                Primary assignment
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                Mark this as the staff member's main department (informational only).
                            </p>
                        </div>
                    </label>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                            Notes <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any context about this assignment…"
                            rows={3}
                            maxLength={1000}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition resize-none"
                        />
                    </div>

                    {/* Inline error */}
                    {inlineError && (
                        <div className="flex items-start gap-2.5 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            {inlineError}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !selectedUser || !selectedBranch}
                        className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Assigning…</>
                        ) : (
                            <><UserCheck className="w-4 h-4" /> Assign Staff</>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
};

// ── By Department Tab ─────────────────────────────────────────────────────────

const ByDepartmentView = ({ departments, users, branches }) => {
    const [selectedDept, setSelectedDept] = useState(null);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);

    const deptOptions = departments.map((d) => ({
        value: d.id,
        label: d.department_name,
    }));

    const loadStaff = useCallback(async (deptId, silent = false) => {
        if (!deptId) return;
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_BASE_URL}department-users/department-staff`, {
                params: { department_id: deptId },
                headers: apiHeaders(),
            });
            setStaff(res.data.data || []);
        } catch (err) {
            setError(
                err?.response?.data?.message || "Could not load staff. Please try again."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (selectedDept) {
            loadStaff(selectedDept.value);
        } else {
            setStaff([]);
            setError("");
        }
    }, [selectedDept, loadStaff]);

    return (
        <div className="space-y-5">
            {/* Department selector + Add Staff button */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                            Select Department
                        </label>
                        <Select
                            options={deptOptions}
                            value={selectedDept}
                            onChange={setSelectedDept}
                            placeholder="Search department…"
                            isClearable
                            classNames={getSelectClassNames()}
                        />
                    </div>
                    {selectedDept && (
                        <div className="flex items-end gap-2 self-end sm:self-auto">
                            <button
                                onClick={() => loadStaff(selectedDept.value, true)}
                                disabled={refreshing}
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition disabled:opacity-50"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                            </button>
                            <button
                                onClick={() => setDrawerOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add Staff
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Staff table */}
            {selectedDept && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    {/* Table header */}
                    <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Active Staff — {selectedDept.label}
                            </span>
                            {!loading && staff.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                                    {staff.length}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
                            <p className="text-sm text-gray-400 dark:text-gray-500">Loading staff…</p>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <AlertCircle className="w-8 h-8 text-red-400 dark:text-red-500" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                            <button
                                onClick={() => loadStaff(selectedDept.value)}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !error && staff.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Users className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No active staff in this department</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Use "Add Staff" to assign someone.</p>
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && staff.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/70 dark:bg-gray-800/40">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Staff Member</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Branch</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Assigned</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {staff.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <StaffAvatar name={row.user?.name} />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{row.user?.name || "—"}</p>
                                                        {row.is_primary && <PrimaryBadge />}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 hidden sm:table-cell text-sm text-gray-500 dark:text-gray-400">
                                                {row.branch?.name || "—"}
                                            </td>
                                            <td className="px-5 py-3.5 hidden md:table-cell">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDate(row.assigned_at)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <RemoveButton
                                                    assignmentId={row.id}
                                                    onRemoved={() => loadStaff(selectedDept.value, true)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Add Staff drawer */}
            <AddStaffDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                departmentId={selectedDept?.value}
                branches={branches}
                users={users}
                onAssigned={() => {
                    setDrawerOpen(false);
                    if (selectedDept) loadStaff(selectedDept.value, true);
                }}
            />
        </div>
    );
};

// ── By User Tab ───────────────────────────────────────────────────────────────

const ByUserView = ({ users }) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const userOptions = users.map((u) => ({ value: u.id, label: u.name }));

    const loadAssignments = useCallback(async (userId, silent = false) => {
        if (!userId) return;
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_BASE_URL}department-users/user-departments`, {
                params: { user_id: userId },
                headers: apiHeaders(),
            });
            setAssignments(res.data.data || []);
        } catch (err) {
            setError(
                err?.response?.data?.message || "Could not load assignments. Please try again."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (selectedUser) {
            loadAssignments(selectedUser.value);
        } else {
            setAssignments([]);
            setError("");
        }
    }, [selectedUser, loadAssignments]);

    return (
        <div className="space-y-5">
            {/* User selector */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                            Select Staff Member
                        </label>
                        <Select
                            options={userOptions}
                            value={selectedUser}
                            onChange={setSelectedUser}
                            placeholder="Search by name…"
                            isClearable
                            classNames={getSelectClassNames()}
                        />
                    </div>
                    {selectedUser && (
                        <button
                            onClick={() => loadAssignments(selectedUser.value, true)}
                            disabled={refreshing}
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition disabled:opacity-50 self-end sm:self-auto"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        </button>
                    )}
                </div>
            </div>

            {/* Assignments table */}
            {selectedUser && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Layers className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Active Departments — {selectedUser.label}
                            </span>
                            {!loading && assignments.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                                    {assignments.length}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
                            <p className="text-sm text-gray-400 dark:text-gray-500">Loading assignments…</p>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <AlertCircle className="w-8 h-8 text-red-400 dark:text-red-500" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                            <button
                                onClick={() => loadAssignments(selectedUser.value)}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !error && assignments.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Layers className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Not assigned to any department</p>
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && assignments.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/70 dark:bg-gray-800/40">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Branch</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Assigned</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {assignments.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                        {row.department?.department_name || "—"}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {row.department?.type && (
                                                            <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                                                                {row.department.type}
                                                            </span>
                                                        )}
                                                        {row.is_primary && <PrimaryBadge />}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 hidden sm:table-cell text-sm text-gray-500 dark:text-gray-400">
                                                {row.branch?.name || "—"}
                                            </td>
                                            <td className="px-5 py-3.5 hidden md:table-cell">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDate(row.assigned_at)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <RemoveButton
                                                    assignmentId={row.id}
                                                    onRemoved={() => loadAssignments(selectedUser.value, true)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Manage Departments Tab ────────────────────────────────────────────────────

const TYPE_BADGE_CLASSES = {
    clinical:  "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    lab:       "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    radiology: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    pharmacy:  "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    other:     "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const DisableConfirmModal = ({ department, onConfirm, onCancel, loading }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onCancel} />
        {/* Dialog */}
        <div className="relative z-10 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Disable {department.department_name}?
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Disabling <span className="font-medium text-gray-700 dark:text-gray-300">{department.department_name}</span> will
                        remove it from all department dropdowns app-wide immediately. Any visit currently routed
                        to this department will keep its existing record, but you will no longer be able to:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400 list-disc list-inside">
                        <li>Assign new visits to this department</li>
                        <li>Assign staff to this department</li>
                        <li>See it as an option anywhere in the application</li>
                    </ul>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Existing historical records referencing this department are not affected or
                        hidden — only its future availability changes.
                    </p>
                </div>
            </div>
            <div className="flex gap-3 pt-2">
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Disabling…</>
                    ) : (
                        "Confirm Disable"
                    )}
                </button>
            </div>
        </div>
    </div>
);

const ManageDepartmentsView = () => {
    const token = getToken();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState(null);
    const [confirmTarget, setConfirmTarget] = useState(null); // dept being confirmed for disable

    const load = useCallback(async () => {
        setLoading(true);
        const data = await fetchAllDepartmentsForAdmin(token);
        setDepartments(data);
        setLoading(false);
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const handleToggle = async (dept) => {
        // If currently active → show confirmation modal first
        if (dept.is_active) {
            setConfirmTarget(dept);
            return;
        }
        // If currently inactive → re-enable immediately (no destructive consequence)
        await doToggle(dept);
    };

    const doToggle = async (dept) => {
        setTogglingId(dept.id);
        setConfirmTarget(null);
        try {
            const res = await axios.post(
                `${API_BASE_URL}config/toggleDepartmentStatus`,
                { department_id: dept.id },
                { headers: apiHeaders() }
            );
            if (res.data.success) {
                toast.success(res.data.message || "Department status updated.");
                // Optimistic update confirmed by server response
                setDepartments((prev) =>
                    prev.map((d) =>
                        d.id === res.data.department.id
                            ? { ...d, is_active: res.data.department.is_active }
                            : d
                    )
                );
            } else {
                toast.error(res.data.message || "Failed to update department status.");
            }
        } catch (err) {
            toast.error(
                err?.response?.data?.message || "Something went wrong. Please try again."
            );
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="space-y-5">
            {/* Confirmation modal */}
            {confirmTarget && (
                <DisableConfirmModal
                    department={confirmTarget}
                    loading={togglingId === confirmTarget.id}
                    onConfirm={() => doToggle(confirmTarget)}
                    onCancel={() => setConfirmTarget(null)}
                />
            )}

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {/* Card header */}
                <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Layers className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            All Departments
                        </span>
                        {!loading && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                                {departments.length}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">Loading departments…</p>
                    </div>
                )}

                {/* Table */}
                {!loading && (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/70 dark:bg-gray-800/40">
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Slug</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Type</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {departments.map((dept) => {
                                    const typeCls = TYPE_BADGE_CLASSES[dept.type] || TYPE_BADGE_CLASSES.other;
                                    const isToggling = togglingId === dept.id;
                                    return (
                                        <tr
                                            key={dept.id}
                                            className={`transition-colors ${dept.is_active ? "hover:bg-gray-50 dark:hover:bg-gray-800/40" : "bg-gray-50/60 dark:bg-gray-800/20 opacity-70"}`}
                                        >
                                            <td className="px-5 py-3.5">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                    {dept.department_name}
                                                </p>
                                            </td>
                                            <td className="px-5 py-3.5 hidden sm:table-cell text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                {dept.slug}
                                            </td>
                                            <td className="px-5 py-3.5 hidden md:table-cell">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeCls}`}>
                                                    {dept.type}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <button
                                                    onClick={() => handleToggle(dept)}
                                                    disabled={isToggling}
                                                    title={dept.is_active ? "Click to disable" : "Click to enable"}
                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-60 ${
                                                        dept.is_active
                                                            ? "bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-700 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 border border-green-200 dark:border-green-800 hover:border-red-200 dark:hover:border-red-800"
                                                            : "bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 border border-gray-200 dark:border-gray-700"
                                                    }`}
                                                >
                                                    {isToggling ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : dept.is_active ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                    )}
                                                    {isToggling ? "Saving…" : dept.is_active ? "Active" : "Disabled"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Main Page Component ───────────────────────────────────────────────────────

export default function DepartmentStaffing() {
    const [activeTab, setActiveTab] = useState("by-department");
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [bootstrapLoading, setBootstrapLoading] = useState(true);

    const token = getToken();

    const bootstrap = useCallback(async () => {
        setBootstrapLoading(true);
        try {
            const [depts, brs, usersRes] = await Promise.all([
                fetchDepartments(token),
                fetchActiveFacilityBranches(token),
                // getUsersDetails returns { users: [{id, name, ...}] }
                // — same endpoint used by GeneralActivityLogsViewer
                axios.get(`${API_BASE_URL}getUsersDetails`, { headers: apiHeaders() }),
            ]);
            setDepartments(depts);
            setBranches(brs);
            setUsers(usersRes.data.users || []);
        } catch {
            // Individual helpers already toast errors; swallow here
        } finally {
            setBootstrapLoading(false);
        }
    }, [token]);

    useEffect(() => {
        bootstrap();
    }, [bootstrap]);

    const tabs = [
        { id: "manage-departments", label: "Manage Departments", icon: Layers },
        { id: "by-department", label: "By Department", icon: Building2 },
        { id: "by-user", label: "By User", icon: Users },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
            <ToastContainer position="top-right" autoClose={3500} hideProgressBar={false} />

            {/* Page header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                Department Staffing
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Manage staff assignments to departments by branch
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex gap-1 border-b border-transparent">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === id
                                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="w-full px-6 py-8">
                {bootstrapLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="w-9 h-9 text-indigo-500 animate-spin" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">Loading data…</p>
                    </div>
                ) : (
                    <>
                        {activeTab === "manage-departments" && (
                            <ManageDepartmentsView />
                        )}
                        {activeTab === "by-department" && (
                            <ByDepartmentView
                                departments={departments}
                                users={users}
                                branches={branches}
                            />
                        )}
                        {activeTab === "by-user" && (
                            <ByUserView users={users} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
