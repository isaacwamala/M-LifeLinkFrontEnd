import React, { useState, useEffect, useRef } from 'react';
import {
    Send, Users, Megaphone, AlertCircle, Search, X,
    CheckCircle, ChevronDown, Bell, User
} from 'lucide-react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { API_BASE_URL } from '../general/constants';

// ── Module-level helpers (never re-created on parent renders) ─────────────────

const BODY_MAX = 1000;

function CharCount({ value, max }) {
    const left = max - value.length;
    return (
        <span className={`text-[11px] tabular-nums ${left < 50 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
            {left} / {max}
        </span>
    );
}

function SuccessBanner({ message, onDismiss }) {
    return (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{message}</p>
            </div>
            <button onClick={onDismiss} className="text-emerald-400 hover:text-emerald-600 transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// ── Preview card — module-level so its identity never changes ────────────────

function NotificationPreview({ isPriority, subject, body }) {
    return (
        <div className={`rounded-xl border-l-4 border border-gray-200 dark:border-gray-700 p-4 ${
            isPriority
                ? 'border-l-red-400 dark:border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
                : 'border-l-blue-400 dark:border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10'
        }`}>
            <div className="flex items-center gap-1.5 mb-2">
                {isPriority
                    ? <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    : <Megaphone   className="w-3.5 h-3.5 text-blue-500" />}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isPriority ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                }`}>
                    {isPriority ? 'Priority' : 'General'}
                </span>
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                {subject || <span className="italic text-gray-400 font-normal">Subject preview…</span>}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                {body || <span className="italic">Message body preview…</span>}
            </p>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SendNotifications() {
    const token = localStorage.getItem('access_token');

    const [activeTab,     setActiveTab]     = useState('priority');
    const [subject,       setSubject]       = useState('');
    const [body,          setBody]          = useState('');
    const [actionText,    setActionText]    = useState('');
    const [sending,       setSending]       = useState(false);
    const [success,       setSuccess]       = useState(null);

    // Priority-tab extras
    const [allUsers,      setAllUsers]      = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [userSearch,    setUserSearch]    = useState('');
    const [dropdownOpen,  setDropdownOpen]  = useState(false);
    const [loadingUsers,  setLoadingUsers]  = useState(false);
    const dropdownRef = useRef(null);

    // ── Fetch users — correct endpoint + correct data path ───────
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoadingUsers(true);
                const { data } = await axios.get(`${API_BASE_URL}getUserAccounts`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                // API returns: { data: { userDetails: [...] } }
                const list = data?.data?.userDetails ?? [];
                setAllUsers(list);
            } catch (err) {
                console.error('Failed to fetch users:', err);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, [token]);

    // ── Close dropdown on outside click ─────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const resetForm = () => {
        setSubject('');
        setBody('');
        setActionText('');
        setSelectedUsers([]);
        setUserSearch('');
    };

    const toggleUser = (user) =>
        setSelectedUsers(prev =>
            prev.some(u => u.id === user.id)
                ? prev.filter(u => u.id !== user.id)
                : [...prev, user]
        );

    const removeUser = (userId) =>
        setSelectedUsers(prev => prev.filter(u => u.id !== userId));

    const filteredUsers = allUsers.filter(u => {
        const q = userSearch.toLowerCase();
        return (
            (u.name     ?? '').toLowerCase().includes(q) ||
            (u.email    ?? '').toLowerCase().includes(q) ||
            (u.username ?? '').toLowerCase().includes(q)
        );
    });

    // ── Send priority ────────────────────────────────────────────
    const handleSendPriority = async (e) => {
        e.preventDefault();
        if (!subject.trim())            return toast.error('Subject is required.');
        if (!body.trim())               return toast.error('Message body is required.');
        if (selectedUsers.length === 0) return toast.error('Select at least one recipient.');

        try {
            setSending(true);
            await axios.post(
                `${API_BASE_URL}notify/sendNotificationPerUser`,
                {
                    user_ids:   selectedUsers.map(u => u.id),
                    subject,
                    body,
                    priority:   'high',
                    actionText: actionText || undefined,
                },
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            setSuccess(`Priority notification sent to ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}.`);
            resetForm();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Failed to send notification.');
        } finally {
            setSending(false);
        }
    };

    // ── Send broadcast ───────────────────────────────────────────
    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!subject.trim()) return toast.error('Subject is required.');
        if (!body.trim())    return toast.error('Message body is required.');

        try {
            setSending(true);
            const { data } = await axios.post(
                `${API_BASE_URL}notify/sendNotificationToAllUsers`,
                {
                    subject,
                    body,
                    priority:   'general',
                    actionText: actionText || undefined,
                },
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            setSuccess(data.message ?? `Broadcast queued for ${data.total_queued ?? 'all'} users.`);
            resetForm();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Failed to broadcast.');
        } finally {
            setSending(false);
        }
    };

    const isPriority = activeTab === 'priority';

    // ── Render ────────────────────────────────────────────────────
    return (
        <>
            <ToastContainer position="top-right" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 sm:p-8 transition-colors">
                <div className="w-full">

                    {/* Page header */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Send Notifications</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Send targeted or system-wide alerts to users
                            </p>
                        </div>
                    </div>

                    {/* Success banner */}
                    {success && (
                        <div className="mb-6">
                            <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 w-fit">
                        <button
                            onClick={() => { setActiveTab('priority'); setSuccess(null); resetForm(); }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === 'priority'
                                    ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            <AlertCircle className="w-4 h-4" />
                            Priority
                        </button>
                        <button
                            onClick={() => { setActiveTab('broadcast'); setSuccess(null); resetForm(); }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === 'broadcast'
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            <Megaphone className="w-4 h-4" />
                            Broadcast
                        </button>
                    </div>

                    {/* Content grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                        {/* ── Form column ───────────────────────────────── */}
                        <div className="lg:col-span-3">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

                                {/* Tab header */}
                                <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-700 ${
                                    isPriority
                                        ? 'bg-red-50/60 dark:bg-red-950/20'
                                        : 'bg-blue-50/40 dark:bg-blue-950/10'
                                }`}>
                                    <div className="flex items-center gap-2.5">
                                        {isPriority
                                            ? <AlertCircle className="w-5 h-5 text-red-500" />
                                            : <Megaphone   className="w-5 h-5 text-blue-500" />}
                                        <div>
                                            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                                                {isPriority ? 'Priority Notification' : 'General Broadcast'}
                                            </h2>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {isPriority
                                                    ? 'Send an urgent alert to specific users'
                                                    : 'Broadcast an announcement to all system users'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <form
                                    onSubmit={isPriority ? handleSendPriority : handleBroadcast}
                                    className="p-6 space-y-5"
                                >
                                    {/* ── Priority: recipient selector ──── */}
                                    {isPriority && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                                Recipients <span className="text-red-500">*</span>
                                            </label>

                                            {/* Selected user pills */}
                                            {selectedUsers.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    {selectedUsers.map(u => (
                                                        <span
                                                            key={u.id}
                                                            className="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                                                        >
                                                            <User className="w-3 h-3" />
                                                            {u.name ?? u.username ?? u.email}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeUser(u.id)}
                                                                className="ml-0.5 hover:text-red-500 transition-colors"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Searchable dropdown */}
                                            <div className="relative" ref={dropdownRef}>
                                                <div
                                                    className="flex items-center gap-2 w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-text"
                                                    onClick={() => setDropdownOpen(true)}
                                                >
                                                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                                                    <input
                                                        type="text"
                                                        value={userSearch}
                                                        onChange={e => { setUserSearch(e.target.value); setDropdownOpen(true); }}
                                                        placeholder="Search users by name or email…"
                                                        className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                                                    />
                                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
                                                </div>

                                                {dropdownOpen && (
                                                    <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                                                        {loadingUsers ? (
                                                            <div className="px-4 py-4 text-xs text-gray-400 text-center">Loading users…</div>
                                                        ) : filteredUsers.length === 0 ? (
                                                            <div className="px-4 py-4 text-xs text-gray-400 text-center">No users match your search.</div>
                                                        ) : (
                                                            filteredUsers.map(u => {
                                                                const isSelected = selectedUsers.some(s => s.id === u.id);
                                                                return (
                                                                    <button
                                                                        key={u.id}
                                                                        type="button"
                                                                        onClick={() => toggleUser(u)}
                                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                                                            isSelected
                                                                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                        }`}
                                                                    >
                                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                                            {(u.name ?? u.username ?? '?').charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                                                {u.name ?? u.username}
                                                                            </p>
                                                                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                                                {u.email}
                                                                            </p>
                                                                        </div>
                                                                        {isSelected && <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />}
                                                                    </button>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {selectedUsers.length > 0 && (
                                                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                    {selectedUsers.length} recipient{selectedUsers.length !== 1 ? 's' : ''} selected
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* ── Broadcast: audience note ──────── */}
                                    {!isPriority && (
                                        <div className="flex items-center gap-3 p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-lg">
                                            <Users className="w-4 h-4 text-blue-500 shrink-0" />
                                            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                                                This message will be sent to <strong>all users</strong> in the system.
                                            </p>
                                        </div>
                                    )}

                                    {/*
                                     * ── Shared fields ────────────────────────────────────
                                     * These are inlined here — NOT in a sub-component.
                                     * Defining them as a const inside the render function
                                     * causes React to see a new component type on every
                                     * keystroke, unmounting and remounting the inputs and
                                     * making the cursor jump out after every character.
                                     */}

                                    {/* Subject */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                            Subject <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={e => setSubject(e.target.value)}
                                            placeholder="e.g. System maintenance scheduled"
                                            maxLength={255}
                                            className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                        />
                                    </div>

                                    {/* Body */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Message <span className="text-red-500">*</span>
                                            </label>
                                            <CharCount value={body} max={BODY_MAX} />
                                        </div>
                                        <textarea
                                            value={body}
                                            onChange={e => setBody(e.target.value)}
                                            placeholder="Write your notification message here…"
                                            rows={5}
                                            maxLength={BODY_MAX}
                                            className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                                        />
                                    </div>

                                    {/* Action label (optional) */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                            Action Label{' '}
                                            <span className="text-gray-400 font-normal normal-case">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={actionText}
                                            onChange={e => setActionText(e.target.value)}
                                            placeholder="e.g. View Details"
                                            maxLength={80}
                                            className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                        />
                                    </div>

                                    {/* Submit */}
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={sending}
                                            className={`w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm ${
                                                isPriority
                                                    ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
                                                    : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                                            }`}
                                        >
                                            {sending ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                    </svg>
                                                    Sending…
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    {isPriority ? 'Send Priority Notification' : 'Broadcast to All Users'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* ── Preview + Tips column ──────────────────────── */}
                        <div className="lg:col-span-2 space-y-5">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                                    Notification Preview
                                </h3>
                                <NotificationPreview
                                    isPriority={isPriority}
                                    subject={subject}
                                    body={body}
                                />
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                                    Tips
                                </h3>
                                <ul className="space-y-2.5 text-xs text-gray-500 dark:text-gray-400">
                                    <li className="flex gap-2">
                                        <span className="text-red-400 shrink-0 font-bold">•</span>
                                        <span>
                                            <strong className="text-gray-700 dark:text-gray-300">Priority</strong> notifications appear
                                            with a red indicator — use for urgent alerts only.
                                        </span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-blue-400 shrink-0 font-bold">•</span>
                                        <span>
                                            <strong className="text-gray-700 dark:text-gray-300">Broadcasts</strong> are queued and
                                            delivered asynchronously to avoid overloading the server.
                                        </span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-gray-400 shrink-0 font-bold">•</span>
                                        <span>Keep subjects concise so they display clearly in the notification bell panel.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
