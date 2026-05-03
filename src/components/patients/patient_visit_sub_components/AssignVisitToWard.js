//This component is used in the PatientVisit component to assign a visit to a ward. 
// It is a drawer that slides in from the right and allows the user 
// to select an available ward and add optional notes before confirming the assignment.


import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, BedDouble, CheckCircle2, Loader2, AlertCircle,
    Building2, Hash, Users, MapPin, Info, ChevronRight,
    StickyNote, Layers
} from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../general/constants';
import { fetchWardsData } from '../../general/helpers';

// ─── Shared input styles ───────────────────────────────────────────────────────
const textareaCls = "w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm transition-all placeholder-gray-400 dark:placeholder-gray-500 resize-none leading-relaxed";

// ─── Ward status badge ─────────────────────────────────────────────────────────
const WardStatusBadge = ({ status }) => {
    const map = {
        available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
        closed:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
        full:      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${map[status] ?? map.available}`}>
            {status}
        </span>
    );
};

// ─── Ward selection card ───────────────────────────────────────────────────────
const WardCard = ({ ward, selected, onSelect }) => {
    const isUnavailable = ward.status === 'closed' || ward.status === 'full';

    return (
        <button
            type="button"
            disabled={isUnavailable}
            onClick={() => !isUnavailable && onSelect(ward)}
            className={`
                w-full text-left p-4 rounded-xl border-2 transition-all relative
                ${isUnavailable
                    ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30'
                    : selected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                }
            `}
        >
            {/* Selection indicator */}
            {selected && !isUnavailable && (
                <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-blue-500" />
            )}

            {/* Ward icon + name row */}
            <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                    ${selected
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                    }`}>
                    <BedDouble className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${selected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100'}`}>
                        {ward.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Hash className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{ward.number}</span>
                    </div>
                </div>
            </div>

            {/* Ward meta row */}
            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                    {/* Capacity */}
                    <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                        <Users className="w-3 h-3" />
                        {ward.capacity} beds
                    </span>
                    {/* Branch */}
                    {ward.branch?.name && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                            <MapPin className="w-3 h-3" />
                            {ward.branch.name}
                        </span>
                    )}
                </div>
                <WardStatusBadge status={ward.status} />
            </div>
        </button>
    );
};


// ══════════════════════════════════════════════════════════════════════════════
//  AssignVisitToWard
//  Props:
//    isOpen     – boolean
//    onClose    – () => void
//    visit      – full visit object  (needs visit.id, visit.visit_number, visit.patient.name)
//    token      – JWT string
//    onSuccess  – (result) => void   optional callback after successful assignment
// ══════════════════════════════════════════════════════════════════════════════
export function AssignVisitToWard({ isOpen, onClose, visit, token, onSuccess }) {
    const [wards, setWards]             = useState([]);
    const [loadingWards, setLoadingWards] = useState(false);
    const [selectedWard, setSelectedWard] = useState(null);
    const [notes, setNotes]             = useState('');
    const [submitting, setSubmitting]   = useState(false);

    // Load wards when drawer opens
    useEffect(() => {
        if (!isOpen) return;
        setSelectedWard(null);
        setNotes('');
        const load = async () => {
            setLoadingWards(true);
            const data = await fetchWardsData(token);
            setWards(data ?? []);
            setLoadingWards(false);
        };
        load();
    }, [isOpen, token]);

    const handleSubmit = async () => {
        if (!selectedWard) {
            toast.error('Please select a ward before assigning');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                visit_id: visit.id,
                ward_id:  selectedWard.id,
                notes:    notes.trim() || undefined,
            };

            const res = await axios.post(
                `${API_BASE_URL}visitAssign/assignVisitToWard`,
                payload,
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' } }
            );

            toast.success(`Visit assigned to ${selectedWard.name} successfully`);
            onSuccess?.(res.data?.data ?? res.data);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to assign visit to ward');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const availableCount = wards.filter(w => w.status === 'available').length;

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

                {/* ── Header ── */}
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800
                    bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <BedDouble className="w-5 h-5" />
                            Assign Visit to Ward
                        </h2>
                        <p className="text-blue-100 text-xs mt-1">
                            Visit: <span className="font-semibold">{visit?.visit_number}</span>
                            {visit?.patient?.name && <> &mdash; {visit.patient.name}</>}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-white/20 text-white transition mt-0.5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            Select an available ward below to admit this patient. Wards marked <span className="font-bold">closed</span> cannot be selected.
                        </p>
                    </div>

                    {/* ── Ward selection ── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">Select Ward <span className="text-red-500">*</span></p>
                            </div>
                            {!loadingWards && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {availableCount} of {wards.length} available
                                </span>
                            )}
                        </div>

                        {loadingWards ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                                            <div className="flex-1 space-y-2 pt-1">
                                                <div className="h-4 w-36 rounded-full bg-gray-200 dark:bg-gray-700" />
                                                <div className="h-3 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : wards.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-10 text-center">
                                <BedDouble className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">No wards found</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Contact your administrator to set up wards</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {wards.map(ward => (
                                    <WardCard
                                        key={ward.id}
                                        ward={ward}
                                        selected={selectedWard?.id === ward.id}
                                        onSelect={setSelectedWard}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Selected ward summary ── */}
                    {selectedWard && (
                        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                    {selectedWard.name}
                                </p>
                                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                                    {selectedWard.number} &bull; {selectedWard.capacity} beds &bull; {selectedWard.branch?.name}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedWard(null)}
                                className="ml-auto p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-400 transition"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* ── Notes ── */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">Admission Notes</p>
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(optional)</span>
                        </div>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. Patient admitted for observation, requires quiet room, allergic to penicillin…"
                            className={textareaCls}
                        />
                    </div>

                </div>

                {/* ── Footer ── */}
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
                        onClick={handleSubmit}
                        disabled={submitting || !selectedWard}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white
                            bg-gradient-to-r from-blue-600 to-indigo-600
                            hover:from-blue-700 hover:to-indigo-700
                            disabled:opacity-40 disabled:cursor-not-allowed
                            transition shadow-lg shadow-blue-200 dark:shadow-blue-900/50"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning…</>
                            : <><BedDouble className="w-4 h-4" /> Assign to Ward <ChevronRight className="w-4 h-4" /></>
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