import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, AlertCircle, Megaphone, Clock } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../general/constants';

const POLL_INTERVAL_MS = 60_000; // re-fetch every 60 s

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export function NotificationBell() {
    const [isOpen,       setIsOpen]       = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading,      setLoading]      = useState(false);
    const [markingId,    setMarkingId]    = useState(null);
    const panelRef = useRef(null);
    const token    = localStorage.getItem('access_token');

    // ── Fetch ────────────────────────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_BASE_URL}notify/getNotifications`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Notification fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    // ── Mark one as read ─────────────────────────────────────────
    const markAsRead = async (id) => {
        try {
            setMarkingId(id);
            await axios.put(
                `${API_BASE_URL}notify/readNotification`,
                { id },
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            // Optimistic remove from list
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Mark-read error:', err);
        } finally {
            setMarkingId(null);
        }
    };

    // ── Mark all as read ─────────────────────────────────────────
    const markAllAsRead = async () => {
        for (const n of notifications) {
            await markAsRead(n.id);
        }
    };

    // ── Poll on mount ────────────────────────────────────────────
    useEffect(() => {
        fetchNotifications();
        const id = setInterval(fetchNotifications, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [fetchNotifications]);

    // ── Close on outside click ───────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const unreadCount = notifications.length;

    return (
        <>
            {/* ── Bell button ─────────────────────────────────────── */}
            <button
                onClick={() => {
                    setIsOpen(prev => !prev);
                    if (!isOpen) fetchNotifications();
                }}
                aria-label="Notifications"
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
                <Bell className="w-6 h-6 text-gray-700 dark:text-gray-200" />

                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* ── Slide-in panel ──────────────────────────────────── */}
            {isOpen && (
                <>
                    {/* Dim overlay */}
                    <div
                        className="fixed inset-0 bg-black/25 dark:bg-black/50 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div
                        ref={panelRef}
                        className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                    <Bell className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                                        Notifications
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {loading
                                            ? 'Refreshing…'
                                            : unreadCount > 0
                                                ? `${unreadCount} unread`
                                                : 'All caught up'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {unreadCount > 1 && (
                                    <button
                                        onClick={markAllAsRead}
                                        title="Mark all as read"
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        All read
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable list */}
                        <div className="flex-1 overflow-y-auto">
                            {loading && notifications.length === 0 ? (
                                /* Loading skeleton */
                                <div className="p-5 space-y-4">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="animate-pulse space-y-2">
                                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                                            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                                            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
                                        </div>
                                    ))}
                                </div>
                            ) : notifications.length > 0 ? (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {notifications.map(n => {
                                        const isPriority = n.priority === 'high';
                                        const isBusy     = markingId === n.id;

                                        return (
                                            <li
                                                key={n.id}
                                                className={`px-5 py-4 transition-colors ${
                                                    isPriority
                                                        ? 'bg-red-50/60 dark:bg-red-950/20 border-l-[3px] border-l-red-500'
                                                        : 'border-l-[3px] border-l-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                                }`}
                                            >
                                                {/* Type badge + dismiss */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                                                        isPriority
                                                            ? 'text-red-600 dark:text-red-400'
                                                            : 'text-blue-600 dark:text-blue-400'
                                                    }`}>
                                                        {isPriority
                                                            ? <AlertCircle className="w-3 h-3" />
                                                            : <Megaphone   className="w-3 h-3" />}
                                                        {isPriority ? 'Priority' : 'General'}
                                                    </span>

                                                    <button
                                                        onClick={() => markAsRead(n.id)}
                                                        disabled={isBusy}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-40"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                        {isBusy ? '…' : 'Dismiss'}
                                                    </button>
                                                </div>

                                                {/* Subject */}
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2 leading-snug">
                                                    {n.subject}
                                                </p>

                                                {/* Body */}
                                                {n.body && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                                                        {n.body}
                                                    </p>
                                                )}

                                                {/* Timestamp */}
                                                <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                                                    <Clock className="w-3 h-3" />
                                                    {timeAgo(n.created_at)}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                /* Empty state */
                                <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                        <Bell className="w-8 h-8 text-gray-300 dark:bg-gray-600 dark:text-gray-600" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                        No new notifications
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        You're all caught up!
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer — link to full notifications page */}
                        <div className="shrink-0 px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                            <a
                                href="/notifications"
                                className="block text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors py-0.5"
                            >
                                View all notifications →
                            </a>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
