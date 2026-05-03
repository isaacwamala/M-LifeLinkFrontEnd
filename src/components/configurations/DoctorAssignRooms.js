import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../general/constants";
import {
    Building2,
    UserCheck,
    Plus,
    X,
    ChevronDown,
    ChevronRight,
    Stethoscope,
    Clock,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    UserPlus,
    DoorOpen,
    Users,
    Loader2,
    UserMinus,
    LogOut,
} from "lucide-react";
import axios from "axios";

const getToken = () => localStorage.getItem("access_token") || "";

// Format date nicely
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

// Status badge
const StatusBadge = ({ status }) => {
    const map = {
        available: {
            cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            label: "Available",
        },
        occupied: {
            cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            label: "Occupied",
        },
        maintenance: {
            cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            label: "Maintenance",
        },
    };
    const s = map[status] || map["available"];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {s.label}
        </span>
    );
};

// Doctor avatar initials
const DoctorAvatar = ({ name, size = "sm" }) => {
    const initials = name
        ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
        : "DR";
    const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
    return (
        <div className={`${sz} rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-semibold flex-shrink-0`}>
            {initials}
        </div>
    );
};

// ── Drawer ──────────────────────────────────────────────────────────────────
const AssignDrawer = ({ open, onClose, rooms, doctors, onAssigned }) => {
    const [selectedRoom, setSelectedRoom] = useState("");
    const [selectedDoctor, setSelectedDoctor] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (open) { setSelectedRoom(""); setSelectedDoctor(""); setError(""); setSuccess(""); }
    }, [open]);

    const handleSubmit = async () => {
        if (!selectedRoom || !selectedDoctor) {
            setError("Please select both a room and a doctor.");
            return;
        }
        setLoading(true);
        setError("");
        setSuccess("");
        try {
            const token = getToken();
            const res = await axios.post(
                `${API_BASE_URL}set/assignDoctorToRoom`,
                { doctor_id: Number(selectedDoctor), room_id: Number(selectedRoom), action: "assign" },
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
            );
            if (res.data.success || res.status === 200 || res.status === 201) {
                setSuccess("Doctor assigned successfully!");
                onAssigned();
                setTimeout(() => { setSuccess(""); onClose(); }, 1400);
            } else {
                setError(res.data.message || "Assignment failed.");
            }
        } catch (err) {
            setError(err?.response?.data?.message || "An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const selectCls =
        "w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition";

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/30 dark:bg-black/50 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />
            {/* Drawer panel */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assign Doctor</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Link a doctor to a room</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                    {/* Room select */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                            Select Room
                        </label>
                        <div className="relative">
                            <DoorOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <select
                                className={`${selectCls} pl-9 appearance-none`}
                                value={selectedRoom}
                                onChange={(e) => setSelectedRoom(e.target.value)}
                            >
                                <option value="">-- Choose a room --</option>
                                {rooms.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.room_name} ({r.room_number})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Doctor select */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                            Select Doctor
                        </label>
                        <div className="relative">
                            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <select
                                className={`${selectCls} pl-9 appearance-none`}
                                value={selectedDoctor}
                                onChange={(e) => setSelectedDoctor(e.target.value)}
                            >
                                <option value="">-- Choose a doctor --</option>
                                {doctors.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Preview card */}
                    {(selectedRoom || selectedDoctor) && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-2.5">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assignment Preview</p>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                    <DoorOpen className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Room</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {selectedRoom
                                            ? rooms.find((r) => r.id === Number(selectedRoom))?.room_name || "—"
                                            : <span className="text-gray-400 italic">Not selected</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="h-px bg-gray-200 dark:bg-gray-700" />
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                                    <Stethoscope className="w-4 h-4 text-green-500 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Doctor</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {selectedDoctor
                                            ? doctors.find((d) => d.id === Number(selectedDoctor))?.name || "—"
                                            : <span className="text-gray-400 italic">Not selected</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Feedback */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            {success}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !selectedRoom || !selectedDoctor}
                        className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Assigning…</>
                        ) : (
                            <><UserCheck className="w-4 h-4" /> Assign Doctor</>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
};

// ── Unassign confirm inline state per doctor
const UnassignButton = ({ doctor, room, onUnassigned }) => {
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const token = getToken();

    //FUNCTION to unassign doctor from room
    const handleUnassign = async (e) => {
        e.stopPropagation();
        setLoading(true);
        try {
            // Still we use the same endpoint but with action "unassign" 
            // to remove the doctor from the room but sending action as "unassign"
            const res = await axios.post(
                `${API_BASE_URL}set/assignDoctorToRoom`,
                { doctor_id: doctor.id, room_id: room.id, action: "unassign" },
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
            );
            if (res.data.success) {
                setDone(true);
                setTimeout(() => { onUnassigned(); }, 800);
            }
        } catch {
            setConfirming(false);
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Unassigned
            </span>
        );
    }

    if (confirming) {
        return (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Remove doctor?</span>
                <button
                    onClick={handleUnassign}
                    disabled={loading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition disabled:opacity-60"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><UserMinus className="w-3 h-3" /> Yes, remove</>}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition"
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/30 transition group/btn"
        >
            <LogOut className="w-3 h-3 transition group-hover/btn:text-red-500" />
            Unassign
        </button>
    );
};

// ── Room Row ────────────────────────────────────────────────────────────────
const RoomRow = ({ room, isExpanded, onToggle, onRefresh }) => {
    const doctorCount = room.doctors?.length || 0;
    return (
        <>
            <tr
                onClick={onToggle}
                className={`cursor-pointer transition-colors group ${isExpanded
                    ? "bg-blue-50/60 dark:bg-blue-900/10"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
            >
                <td className="pl-4 pr-2 py-3.5 w-8">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-md text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-90 bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400" : "group-hover:bg-gray-100 dark:group-hover:bg-gray-700"}`}>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                </td>
                <td className="px-3 py-3.5">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isExpanded ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                            <DoorOpen className={`w-4 h-4 ${isExpanded ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{room.room_name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{room.room_number}</p>
                        </div>
                    </div>
                </td>
                <td className="px-3 py-3.5 hidden sm:table-cell">
                    <StatusBadge status={room.status} />
                </td>
                <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {doctorCount === 0 ? (
                                <span className="text-xs text-gray-400 dark:text-gray-500 italic">No doctors</span>
                            ) : (
                                room.doctors.slice(0, 3).map((d) => (
                                    <DoctorAvatar key={d.id} name={d.name} size="sm" />
                                ))
                            )}
                            {doctorCount > 3 && (
                                <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    +{doctorCount - 3}
                                </div>
                            )}
                        </div>
                        {doctorCount > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {doctorCount} {doctorCount === 1 ? "doctor" : "doctors"}
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-3 py-3.5 hidden md:table-cell text-xs text-gray-400 dark:text-gray-500">
                    {new Date(room.created_at).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
            </tr>
            {/* Expanded doctor rows */}
            {isExpanded && (
                <tr>
                    <td colSpan={5} className="px-0 pb-1">
                        <div className="mx-4 mb-3 rounded-xl border border-blue-100 dark:border-blue-900/30 overflow-hidden bg-white dark:bg-gray-900">
                            {doctorCount === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No doctors assigned</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Use the Assign Doctor button to add one.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-blue-50 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10">
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Doctor</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider hidden sm:table-cell">Assigned At</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider hidden md:table-cell">Status</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {room.doctors.map((doc, idx) => (
                                            <tr
                                                key={doc.id}
                                                className={`${idx !== room.doctors.length - 1 ? "border-b border-gray-50 dark:border-gray-800" : ""} ${doc.pivot?.unassigned_at ? "opacity-50" : ""}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <DoctorAvatar name={doc.name} size="md" />
                                                        <div>
                                                            <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{doc.name}</p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-500">ID #{doc.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 hidden sm:table-cell">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                                        {formatDate(doc.pivot?.assigned_at)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    {doc.pivot?.unassigned_at ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current" /> Unassigned
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current" /> Active
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {!doc.pivot?.unassigned_at && (
                                                        <UnassignButton
                                                            doctor={doc}
                                                            room={room}
                                                            onUnassigned={onRefresh}
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function RoomDoctorManager() {
    const [rooms, setRooms] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [expandedRooms, setExpandedRooms] = useState(new Set());
    const [drawerOpen, setDrawerOpen] = useState(false);

    const token = getToken();

    // Fetch rooms with assigned doctors
    const fetchRooms = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError("");
        try {
            const res = await axios.get(`${API_BASE_URL}set/getRoomsWithAssignedDoctors`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            });
            if (res.data.success) {
                setRooms(res.data.data || []);
            } else {
                setError("Failed to load rooms.");
            }
        } catch {
            setError("Could not connect to the server. Please check your connection.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    const fetchDoctors = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}set/getDoctors`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            });
            // Try common response shapes
            const list = res.data.doctors || res.data.data || res.data || [];
            setDoctors(Array.isArray(list) ? list : []);
        } catch {
            // Silently fail doctors list; the drawer will show empty
        }
    }, [token]);

    useEffect(() => {
        fetchRooms();
        fetchDoctors();
    }, [fetchRooms, fetchDoctors]);

    const toggleRoom = (roomId) => {
        setExpandedRooms((prev) => {
            const next = new Set(prev);
            next.has(roomId) ? next.delete(roomId) : next.add(roomId);
            return next;
        });
    };

    // Summary stats
    const totalDoctors = rooms.reduce((acc, r) => acc + (r.doctors?.length || 0), 0);
    const assignedRooms = rooms.filter((r) => r.doctors?.length > 0).length;
    const availableRooms = rooms.filter((r) => r.status === "available").length;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                       <div>
    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
        Room Management
    </h1>
    <p className="text-base md:text-lg text-gray-500 dark:text-gray-400">
        Assign and track doctors per room
    </p>
</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchRooms(true)}
                            disabled={refreshing}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Assign Doctor</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-5">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Total Rooms", value: rooms.length, icon: Building2, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
                        { label: "Assigned Rooms", value: assignedRooms, icon: UserCheck, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
                        { label: "Doctors Active", value: totalDoctors, icon: Stethoscope, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`w-4 h-4 ${color}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{value}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    {/* Table header */}
                    <div className="px-4 py-3.5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <DoorOpen className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">All Rooms</span>
                            {rooms.length > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 font-medium">{rooms.length}</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Click a row to see assigned doctors</p>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                            <p className="text-sm text-gray-400 dark:text-gray-500">Loading rooms…</p>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                            <button onClick={() => fetchRooms()} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Try again</button>
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !error && rooms.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">No rooms found</p>
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && rooms.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/70 dark:bg-gray-800/40">
                                        <th className="pl-4 pr-2 py-2.5 w-8" />
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Room</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Status</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Doctors</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {rooms.map((room) => (
                                        <RoomRow
                                            key={room.id}
                                            room={room}
                                            isExpanded={expandedRooms.has(room.id)}
                                            onToggle={() => toggleRoom(room.id)}
                                            onRefresh={() => fetchRooms(true)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Assign Drawer */}
            <AssignDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                rooms={rooms}
                doctors={doctors}
                onAssigned={() => fetchRooms(true)}
            />
        </div>
    );
}