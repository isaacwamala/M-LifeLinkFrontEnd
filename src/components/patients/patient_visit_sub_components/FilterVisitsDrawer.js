import React, { useState, useEffect } from 'react';
import { X, Filter, RefreshCw } from 'lucide-react';

const selectCls =
    'w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white ' +
    'border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 ' +
    'focus:border-transparent focus:outline-none text-sm transition-all';

const STATUS_OPTIONS = [
    { value: '', label: 'Any status' },
    { value: 'waiting',   label: 'Waiting' },
    { value: 'ongoing',   label: 'Ongoing' },
    { value: 'triaged',   label: 'Triaged' },
    { value: 'admitted',  label: 'Admitted' },
    { value: 'completed', label: 'Completed' },
];

const CATEGORY_OPTIONS = [
    { value: '',       label: 'Any category' },
    { value: 'OPD',    label: 'OPD — Outpatient' },
    { value: 'IPD',    label: 'IPD — Inpatient' },
    { value: 'Others', label: 'Others' },
];

const ORIGIN_OPTIONS = [
    { value: '',               label: 'Any origin' },
    { value: 'self_request',   label: 'Self Request' },
    { value: 'doctor_request', label: 'Doctor Request' },
];

const APPROVAL_OPTIONS = [
    { value: '',         label: 'Any approval status' },
    { value: 'pending',  label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

const EMPTY_FILTERS = {
    status: '',
    visit_category: '',
    request_origin: '',
    request_approval_status: '',
};

// ══════════════════════════════════════════════════════════════════════════════
export function FilterVisitsDrawer({ isOpen, onClose, currentFilters, onApply }) {
    const [local, setLocal] = useState({ ...EMPTY_FILTERS, ...currentFilters });

    // sync when drawer re-opens
    useEffect(() => {
        if (isOpen) setLocal({ ...EMPTY_FILTERS, ...currentFilters });
    }, [isOpen]);

    const set = (key, value) => setLocal(prev => ({
        ...prev,
        [key]: value,
        // clear request_origin if category is no longer Others
        ...(key === 'visit_category' && value !== 'Others' ? { request_origin: '' } : {}),
    }));

    const handleApply = () => {
        onApply(local);
        onClose();
    };

    const handleReset = () => {
        const cleared = { ...EMPTY_FILTERS };
        setLocal(cleared);
        onApply(cleared);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm flex flex-col bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-indigo-500" />
                        <h2 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-widest">
                            Filter Visits
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 dark:text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                            Status
                        </label>
                        <select
                            value={local.status}
                            onChange={e => set('status', e.target.value)}
                            className={selectCls}
                        >
                            {STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Visit Category */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                            Visit Category
                        </label>
                        <select
                            value={local.visit_category}
                            onChange={e => set('visit_category', e.target.value)}
                            className={selectCls}
                        >
                            {CATEGORY_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Request Origin — only when category = Others */}
                    {local.visit_category === 'Others' && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                Request Origin
                            </label>
                            <select
                                value={local.request_origin}
                                onChange={e => set('request_origin', e.target.value)}
                                className={selectCls}
                            >
                                {ORIGIN_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Request Approval Status */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                            Request Approval Status
                        </label>
                        <select
                            value={local.request_approval_status}
                            onChange={e => set('request_approval_status', e.target.value)}
                            className={selectCls}
                        >
                            {APPROVAL_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 leading-snug">
                            Use this to surface pending / approved / rejected self-request visits.
                        </p>
                    </div>

                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button
                        onClick={handleReset}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                            text-sm font-medium text-gray-600 dark:text-gray-300
                            bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                        <RefreshCw className="w-4 h-4" /> Reset
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                            text-sm font-semibold text-white
                            bg-gradient-to-r from-indigo-600 to-blue-600
                            hover:from-indigo-700 hover:to-blue-700 transition shadow-md"
                    >
                        <Filter className="w-4 h-4" /> Apply Filters
                    </button>
                </div>
            </div>
        </>
    );
}
