// Drawer to assign (or reassign) a patient visit to a medical room.
// Only shows when visit.status === 'waiting'; the backend enforces this too.
// Rooms with status other than 'available' are visually greyed out but still
// selectable — final enforcement is server-side.

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, DoorOpen, CheckCircle2, Loader2, Info,
    Hash, ChevronRight, Layers, Circle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../general/constants';

// ─── Room status badge ─────────────────────────────────────────────────────────
const RoomStatusBadge = ({ status }) => {
    const map = {
        available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
        occupied:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
        inactive:  'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 border border-gray-200 dark:border-gray-700',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${map[status] ?? map.inactive}`}>
            {status}
        </span>
    );
};

// ─── Room selection card ───────────────────────────────────────────────────────
const RoomCard = ({ room, selected, onSelect }) => {
    const isUnavailable = room.status !== 'available';

    return (
        <button
            type="button"
            onClick={() => onSelect(room)}
            className={`
                w-full text-left p-4 rounded-xl border-2 transition-all relative
                ${isUnavailable
                    ? 'opacity-50 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30'
                    : selected
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm'
                }
            `}
        >
            {selected && (
                <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-violet-500" />
            )}

            <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                    ${selected
                        ? 'bg-violet-600 text-white'
                        : 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
                    }`}>
                    <DoorOpen className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${selected ? 'text-violet-700 dark:text-violet-300' : 'text-gray-800 dark:text-gray-100'}`}>
                        {room.room_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Hash className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{room.room_number}</span>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-end">
                <RoomStatusBadge status={room.status} />
            </div>
        </button>
    );
};


// ══════════════════════════════════════════════════════════════════════════════
//  AssignVisitToRoom
//  Props:
//    isOpen    – boolean
//    onClose   – () => void
//    visit     – visit object (needs visit.id, visit.visit_number, visit.patient.name)
//    token     – JWT string
//    onSuccess – () => void   optional callback after successful assignment
// ══════════════════════════════════════════════════════════════════════════════
export function AssignVisitToRoom({ isOpen, onClose, visit, token, onSuccess }) {
    const [rooms, setRooms]               = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [submitting, setSubmitting]     = useState(false);

    // Load rooms when drawer opens
    useEffect(() => {
        if (!isOpen) return;
        setSelectedRoom(null);

        const load = async () => {
            setLoadingRooms(true);
            try {
                const res = await axios.get(`${API_BASE_URL}set/getMedicalRooms`, {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                });
                // API returns response.data.rooms (same shape as MedicalRoom.js uses)
                setRooms(res.data.rooms ?? []);
            } catch (err) {
                toast.error('Failed to load rooms');
                console.error(err);
            } finally {
                setLoadingRooms(false);
            }
        };
        load();
    }, [isOpen, token]);

    const handleSubmit = async () => {
        if (!selectedRoom) {
            toast.error('Please select a room before assigning');
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post(
                `${API_BASE_URL}visitAssign/assignVisitToRoom`,
                { visit_id: visit.id, room_id: selectedRoom.id },
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' } }
            );

            toast.success(res.data.message || `Visit assigned to ${selectedRoom.room_name} successfully`);
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to assign visit to room');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const availableCount = rooms.filter(r => r.status === 'available').length;

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
                    bg-gradient-to-r from-violet-600 to-purple-600 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <DoorOpen className="w-5 h-5" />
                            Assign Visit to Room
                        </h2>
                        <p className="text-violet-100 text-xs mt-1">
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
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                        <Info className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-violet-700 dark:text-violet-300">
                            Select a room below. Rooms marked <span className="font-bold">occupied</span> or <span className="font-bold">inactive</span> are highlighted — you may still select them, but the room's availability is enforced server-side.
                        </p>
                    </div>

                    {/* ── Room selection ── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                                    <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                </div>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">
                                    Select Room <span className="text-red-500">*</span>
                                </p>
                            </div>
                            {!loadingRooms && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {availableCount} of {rooms.length} available
                                </span>
                            )}
                        </div>

                        {loadingRooms ? (
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
                        ) : rooms.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-10 text-center">
                                <DoorOpen className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">No rooms found</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Contact your administrator to set up medical rooms</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rooms.map(room => (
                                    <RoomCard
                                        key={room.id}
                                        room={room}
                                        selected={selectedRoom?.id === room.id}
                                        onSelect={setSelectedRoom}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Selected room summary ── */}
                    {selectedRoom && (
                        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
                                    {selectedRoom.room_name}
                                </p>
                                <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-0.5">
                                    Room #{selectedRoom.room_number} &bull; {selectedRoom.status}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedRoom(null)}
                                className="ml-auto p-1 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/40 text-violet-400 transition"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

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
                        disabled={submitting || !selectedRoom}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white
                            bg-gradient-to-r from-violet-600 to-purple-600
                            hover:from-violet-700 hover:to-purple-700
                            disabled:opacity-40 disabled:cursor-not-allowed
                            transition shadow-lg shadow-violet-200 dark:shadow-violet-900/50"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning…</>
                            : <><DoorOpen className="w-4 h-4" /> Assign to Room <ChevronRight className="w-4 h-4" /></>
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
