// THIS IS THE LOGIC AND INTERFACE FOR THE
// "ASSIGN VISIT TO DEPARTMENT" DRAWER IN THE PATIENT VISIT PAGE
// IT WILL BE CALLED FROM PATIENT VISIT
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, Building2, Plus, Edit2, Trash2, CheckCircle2, Loader2,
    FlaskConical, Pill, Scissors, Radiation, Stethoscope, ArrowRight,
    AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../general/constants';
import { useNavigate } from 'react-router-dom';

// ─── Reused helpers ────────────────────────────────────────────────────────────


const StatusBadge = ({ status }) => {
    const map = {
        pending:   { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
        waiting:   { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
        ongoing:   { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
        completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
        triaged:   { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    };
    const cfg = map[status] ?? map.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} capitalize`}>
            {status}
        </span>
    );
};

const deptIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('lab'))                       return <FlaskConical className="w-4 h-4" />;
    if (n.includes('pharm'))                     return <Pill className="w-4 h-4" />;
    if (n.includes('surg'))                      return <Scissors className="w-4 h-4" />;
    if (n.includes('radio') || n.includes('imaging')) return <Radiation className="w-4 h-4" />;
    return <Stethoscope className="w-4 h-4" />;
};

const inputCls = "w-full rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm";
// ══════════════════════════════════════════════════════════════════════════════
//  AssignVisitToDepartment
//  Props:
//    isOpen       – boolean
//    onClose      – () => void
//    visit        – the full visit object (visit.id, visit.visit_number, visit.patient.name)
//    token        – JWT string
//    departments  – array of department objects [ { id, department_name, slug } ]
//    doctors      – array of doctor/staff objects [ { id, name } ]
//    onSuccess    – () => void  (optional — called after any mutation so parent can refresh)
// ══════════════════════════════════════════════════════════════════════════════
export function AssignVisitToDepartments({
    isOpen, //load assignments when drawer opens, and also reset form state
    onClose,
    visit,
    token,
    departments = [], //Pass departments ,they will be passed in from Parent(PatientVisit) component
    doctors = [],//Pass doctors ,they will be passed in from Parent(PatientVisit) component
    onSuccess,
}) {
    const navigate = useNavigate();

    // ── Assignment list ────────────────────────────────────────────────────────
    const [assignments, setAssignments]           = useState([]);
    const [loadingAssignments, setLoadingAssignments] = useState(false);

    // ── New assignment form ────────────────────────────────────────────────────
    const [form, setForm]         = useState({ department_id: '', assigned_to: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);

    // ── Inline edit ────────────────────────────────────────────────────────────
    const [editingId, setEditingId]       = useState(null);
    const [editForm, setEditForm]         = useState({ department_id: '' });
    const [editSubmitting, setEditSubmitting] = useState(false);

    // ── Delete confirm ─────────────────────────────────────────────────────────
    const [confirmDeleteId, setConfirmDeleteId]   = useState(null);
    const [deletingId, setDeletingId]             = useState(null);

    // ── Load assignments whenever drawer opens for a visit ─────────────────────
    useEffect(() => {
        if (isOpen && visit?.id) {
            loadAssignments(visit.id);
            // reset form state
            setForm({ department_id: '', assigned_to: '', notes: '' });
            setEditingId(null);
            setConfirmDeleteId(null);
        }
    }, [isOpen, visit?.id]);

    //Get all departments assigned to the visit,
    //They will be displayed in the drawer body, and also used for edit assignment
    const loadAssignments = async (visitId) => {
        setLoadingAssignments(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}visitAssign/getVisitDepartmentsAssignments`,
                {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                    params: { visit_id: visitId },
                }
            );
            setAssignments(res.data.data ?? []);
        } catch (err) {
            console.error(err);
            setAssignments([]);
        } finally {
            setLoadingAssignments(false);
        }
    };

    // ── Assign department ──────────────────────────────────────────────────────
    const handleAssign = async () => {
        if (!form.department_id) { toast.error('Please select a department'); return; }
        setSubmitting(true);
        try {
            await axios.post(
                `${API_BASE_URL}visitAssign/assignVisitToDepartment`,
                {
                    visit_id:      visit.id,
                    department_id: Number(form.department_id),
                    assigned_to:   form.assigned_to ? Number(form.assigned_to) : null,
                    notes:         form.notes,
                },
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
            );
            toast.success('Visit assigned to department successfully');
            setForm({ department_id: '', assigned_to: '', notes: '' });
            await loadAssignments(visit.id);
            onSuccess?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to assign department');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Update assignment department ───────────────────────────────────────────
    const handleUpdate = async (assignmentId) => {
        if (!editForm.department_id) { toast.error('Please select a department'); return; }
        setEditSubmitting(true);
        try {
            await axios.post(
                `${API_BASE_URL}visitAssign/updateAssignedDepartmentOnVisit`,
                {
                    assignment_id: assignmentId,
                    department_id: Number(editForm.department_id),
                },
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
            );
            toast.success('Department updated successfully');
            setEditingId(null);
            setEditForm({ department_id: '' });
            // Optimistic update
            setAssignments(prev =>
                prev.map(a =>
                    a.id === assignmentId
                        ? {
                            ...a,
                            department_id: Number(editForm.department_id),
                            department: departments.find(d => d.id === Number(editForm.department_id)) ?? a.department,
                        }
                        : a
                )
            );
            onSuccess?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update department');
        } finally {
            setEditSubmitting(false);
        }
    };

    // ── Delete assignment ──────────────────────────────────────────────────────
    const handleDelete = async (assignmentId) => {
        setDeletingId(assignmentId);
        try {
            await axios.delete(
                `${API_BASE_URL}visitAssign/deleteVisitDepartmentAssignment/${assignmentId}`,
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
            );
            toast.success('Department assignment removed');
            setConfirmDeleteId(null);
            setAssignments(prev => prev.filter(a => a.id !== assignmentId));
            onSuccess?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to remove assignment');
        } finally {
            setDeletingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-5xl z-50 flex flex-col
                bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700
                animate-slide-in-right">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700
                    bg-indigo-600 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Building2 className="w-5 h-5" /> Assign Visit to Department(s)
                        </h2>
                        <p className="text-indigo-200 text-xs mt-0.5">
                            Visit: <span className="font-semibold">{visit?.visit_number}</span>
                            {visit?.patient?.name && <> &mdash; {visit.patient.name}</>}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-indigo-700 text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

                    {/* ── New assignment form ── */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-indigo-500" /> Assign to a Department
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Department */}
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    Department <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.department_id}
                                    onChange={e => setForm({ ...form, department_id: e.target.value })}
                                    className={inputCls}
                                >
                                    <option value="">Select department</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.department_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Assigned to (staff) */}
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    Assign To (Staff)
                                </label>
                                <select
                                    value={form.assigned_to}
                                    onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                                    className={inputCls}
                                >
                                    <option value="">Select staff member (optional)</option>
                                    {doctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Notes */}
                            <div className="col-span-2">
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                                <textarea
                                    rows={2}
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    placeholder="e.g. Priority blood test needed…"
                                    className={`${inputCls} resize-none`}
                                />
                            </div>

                            {/* Submit */}
                            <div className="col-span-2">
                                <button
                                    onClick={handleAssign}
                                    disabled={submitting}
                                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white
                                        text-sm font-medium disabled:opacity-50 transition flex items-center justify-center gap-2"
                                >
                                    {submitting
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <><Building2 className="w-4 h-4" /> Assign Department</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Current assignments ── */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" /> Current Assignments
                            {assignments.length > 0 && (
                                <span className="ml-auto bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300
                                    text-xs font-semibold px-2 py-0.5 rounded-full">
                                    {assignments.length}
                                </span>
                            )}
                        </h3>

                        {/* Loading skeleton */}
                        {loadingAssignments ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i}
                                        className="rounded-xl border border-gray-200 dark:border-gray-700 p-4
                                            flex items-start gap-3 bg-gray-50 dark:bg-gray-800 animate-pulse">
                                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
                                        <div className="flex-1 space-y-2 pt-1">
                                            <div className="h-3.5 w-36 rounded-full bg-gray-200 dark:bg-gray-700" />
                                            <div className="h-3 w-48 rounded-full bg-gray-200 dark:bg-gray-700" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                        ) : assignments.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-8 text-center">
                                <Building2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">No departments assigned yet</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    Use the form above to route this visit
                                </p>
                            </div>

                        ) : (
                            <div className="space-y-3">
                                {assignments.map(assignment => (
                                    <div key={assignment.id}
                                        className="rounded-xl border border-gray-200 dark:border-gray-700
                                            bg-gray-50 dark:bg-gray-800 overflow-hidden">

                                        {/* Card body */}
                                        <div className="p-4 flex items-start gap-3">
                                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100
                                                dark:bg-indigo-900/40 flex items-center justify-center
                                                text-indigo-600 dark:text-indigo-400">
                                                {deptIcon(assignment.department?.department_name)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                                        {assignment.department?.department_name ?? 'Unknown Department'}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <StatusBadge status={assignment.status} />

                                                        {/* Edit / Delete — only show when no inline panel is open */}
                                                        {confirmDeleteId !== assignment.id && editingId !== assignment.id && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingId(assignment.id);
                                                                        setEditForm({ department_id: String(assignment.department_id) });
                                                                        setConfirmDeleteId(null);
                                                                    }}
                                                                    title="Change department"
                                                                    className="p-1 rounded-md text-gray-400 hover:text-indigo-500
                                                                        hover:bg-indigo-50 dark:hover:bg-indigo-900/20
                                                                        dark:hover:text-indigo-400 transition-colors"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setConfirmDeleteId(assignment.id)}
                                                                    disabled={deletingId === assignment.id}
                                                                    title="Remove assignment"
                                                                    className="p-1 rounded-md text-gray-400 hover:text-red-500
                                                                        hover:bg-red-50 dark:hover:bg-red-900/20
                                                                        dark:hover:text-red-400 disabled:opacity-40 transition-colors"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {assignment.assigned_user && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                        Assigned to:{' '}
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                                            {assignment.assigned_user.name}
                                                        </span>
                                                    </p>
                                                )}
                                                {assignment.assigned_by && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                        By: {assignment.assigned_by.name} &bull;{' '}
                                                        {new Date(assignment.created_at).toLocaleDateString('en-US', {
                                                            month: 'short', day: 'numeric',
                                                            hour: '2-digit', minute: '2-digit',
                                                        })}
                                                    </p>
                                                )}
                                                {assignment.notes && (
                                                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 italic
                                                        bg-white dark:bg-gray-900 px-2 py-1 rounded-md
                                                        border border-gray-200 dark:border-gray-700">
                                                        "{assignment.notes}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── Dept action shortcuts (lab / pharmacy / radiology) ── */}
                                        {!editingId && !confirmDeleteId && (
                                            <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                                                {assignment.department?.slug === 'laboratory' && (
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            navigate(`/visits/${visit.id}/lab-tests/create`, { state: { visit } });
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                                            bg-green-50 text-green-700 border border-green-200 hover:bg-green-100
                                                            dark:bg-green-900/20 dark:text-green-400 dark:border-green-800
                                                            dark:hover:bg-green-900/40 transition"
                                                    >
                                                        <FlaskConical className="w-3.5 h-3.5" /> Request Lab Test
                                                    </button>
                                                )}
                                                {assignment.department?.slug === 'pharmacy' && (
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            navigate(`/visits/${visit.id}/prescription/create`, { state: { visit } });
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                                            bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100
                                                            dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800
                                                            dark:hover:bg-purple-900/40 transition"
                                                    >
                                                        <Pill className="w-3.5 h-3.5" /> New Prescription
                                                    </button>
                                                )}
                                                {assignment.department?.slug === 'radiology' && (
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            navigate(`/visits/${visit.id}/imaging/create`, { state: { visit } });
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                                            bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100
                                                            dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800
                                                            dark:hover:bg-sky-900/40 transition"
                                                    >
                                                        <Radiation className="w-3.5 h-3.5" /> Imaging Request
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* ── Inline edit panel ── */}
                                        {editingId === assignment.id && (
                                            <div className="px-4 py-3 border-t border-indigo-200 dark:border-indigo-800
                                                bg-indigo-50 dark:bg-indigo-900/20">
                                                <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-2">
                                                    Change department
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={editForm.department_id}
                                                        onChange={e => setEditForm({ department_id: e.target.value })}
                                                        className="flex-1 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800
                                                            text-gray-800 dark:text-white border border-indigo-300 dark:border-indigo-600
                                                            focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                    >
                                                        <option value="">Select department</option>
                                                        {departments.map(d => (
                                                            <option key={d.id} value={d.id}>{d.department_name}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => handleUpdate(assignment.id)}
                                                        disabled={editSubmitting}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white
                                                            bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                                                            transition flex items-center gap-1.5 flex-shrink-0"
                                                    >
                                                        {editSubmitting
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : 'Save'
                                                        }
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingId(null); setEditForm({ department_id: '' }); }}
                                                        disabled={editSubmitting}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800
                                                            text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600
                                                            hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition flex-shrink-0"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Delete confirm panel ── */}
                                        {confirmDeleteId === assignment.id && (
                                            <div className="flex items-center justify-between gap-3 px-4 py-2.5
                                                bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                                                <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                                                    Remove{' '}
                                                    <span className="font-bold">
                                                        {assignment.department?.department_name}
                                                    </span>{' '}
                                                    from this visit?
                                                </p>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        disabled={deletingId === assignment.id}
                                                        className="px-3 py-1 rounded-md text-xs font-medium bg-white dark:bg-gray-800
                                                            text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600
                                                            hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(assignment.id)}
                                                        disabled={deletingId === assignment.id}
                                                        className="px-3 py-1 rounded-md text-xs font-medium text-white
                                                            bg-red-600 hover:bg-red-700 disabled:opacity-50
                                                            transition flex items-center gap-1.5"
                                                    >
                                                        {deletingId === assignment.id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Trash2 className="w-3 h-3" />
                                                        }
                                                        Yes, Remove
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700
                    bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700
                            text-gray-700 dark:text-gray-300 text-sm font-medium
                            hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                        Close
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