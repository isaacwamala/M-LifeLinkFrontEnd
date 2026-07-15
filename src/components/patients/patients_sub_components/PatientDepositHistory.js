// Modal showing a patient's full deposit history with running balance and pagination.
// Mirrors PatientWardAssignmentsHistory.js in structure and visual style.

import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    X, Wallet, ChevronLeft, ChevronRight, Loader2, ClipboardList,
    Banknote, Smartphone, User, MapPin, Calendar, StickyNote,
} from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';

/* ─── Payment method badge ────────────────────────────────────────────── */
function MethodBadge({ method }) {
    const map = {
        cash:         { icon: Banknote,    label: 'Cash',          cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
        mobile_money: { icon: Smartphone,  label: 'Mobile Money',  cls: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
    };
    const s = map[method] ?? map.cash;
    const Icon = s.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${s.cls}`}>
            <Icon className="w-3 h-3" />
            {s.label}
        </span>
    );
}

/* ─── Single deposit card ─────────────────────────────────────────────── */
function DepositCard({ deposit, index }) {
    const recordedBy = deposit.recorded_by?.name ?? '—';
    const branch     = deposit.branch?.name       ?? '—';
    const date       = deposit.created_at
        ? new Date(deposit.created_at).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })
        : '—';

    return (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900
            shadow-sm hover:shadow-md transition-shadow overflow-hidden">

            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-2.5
                bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20
                border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center
                        text-[10px] font-bold text-white flex-shrink-0">
                        {index}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <MethodBadge method={deposit.payment_method} />
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {Number(deposit.amount_deposited).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* Card body */}
            <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">

                <div className="flex items-start gap-2">
                    <User className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Recorded By</p>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{recordedBy}</p>
                    </div>
                </div>

                <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Branch</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{branch}</p>
                    </div>
                </div>

                <div className="col-span-2 flex items-start gap-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Date</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{date}</p>
                    </div>
                </div>

                {deposit.additional_info && (
                    <div className="col-span-2 flex items-start gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                        <StickyNote className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">Notes</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{deposit.additional_info}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Main exported component ─────────────────────────────────────────── */
/**
 * PatientDepositHistory
 * Props:
 *   isOpen   – boolean
 *   onClose  – () => void
 *   patient  – patient object (needs patient.id, patient.name, patient.deposited_amount)
 *   token    – JWT string
 */
export function PatientDepositHistory({ isOpen, onClose, patient, token }) {
    const [deposits,     setDeposits]     = useState([]);
    const [loading,      setLoading]      = useState(false);
    const [currentPage,  setCurrentPage]  = useState(1);
    const [totalPages,   setTotalPages]   = useState(1);
    const [total,        setTotal]        = useState(0);

    const patientName = patient?.name ?? 'Patient';
    const initials    = patientName
        .split(' ')
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('');

    const balance = Number(patient?.deposited_amount ?? 0);

    /* ── Fetch ─────────────────────────────────────────────────────────── */
    const fetchDeposits = useCallback(async (page = 1) => {
        if (!patient?.id || !token) return;
        setLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}patient/depositHistory`,
                {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                    params: { patient_id: patient.id, page },
                }
            );
            const d = res.data?.data;
            setDeposits(d?.data         ?? []);
            setCurrentPage(d?.current_page ?? 1);
            setTotalPages( d?.last_page    ?? 1);
            setTotal(      d?.total        ?? 0);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load deposit history.');
        } finally {
            setLoading(false);
        }
    }, [patient?.id, token]);

    useEffect(() => {
        if (isOpen) fetchDeposits(1);
    }, [isOpen, fetchDeposits]);

    if (!isOpen) return null;

    /* ── Render ─────────────────────────────────────────────────────────── */
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl
                bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-hidden">

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 pt-5 pb-4 bg-gradient-to-r from-emerald-600 to-teal-600">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center
                                text-white font-bold text-sm flex-shrink-0">
                                {initials}
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Wallet className="w-4 h-4" /> Patient Deposit History
                                </h2>
                                <p className="text-emerald-200 text-xs mt-0.5">{patientName}</p>
                            </div>
                        </div>
                        <button onClick={onClose}
                            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition flex-shrink-0">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Balance banner ──────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 py-3 border-b border-gray-100 dark:border-gray-800
                    bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        Current Account Balance
                    </span>
                    <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                        {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* ── Summary bar ────────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 py-2 border-b border-gray-100 dark:border-gray-800
                    flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {loading ? 'Loading…' : (
                            total === 0
                                ? 'No deposits recorded yet'
                                : `${total} deposit${total !== 1 ? 's' : ''} found · page ${currentPage} of ${totalPages}`
                        )}
                    </span>
                </div>

                {/* ── Body ───────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16
                            text-gray-400 dark:text-gray-600">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="text-sm">Loading deposit history…</p>
                        </div>
                    ) : deposits.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16
                            text-gray-400 dark:text-gray-600">
                            <ClipboardList className="w-10 h-10 opacity-30" />
                            <p className="text-sm">No deposits recorded for this patient</p>
                        </div>
                    ) : (
                        deposits.map((deposit, i) => (
                            <DepositCard
                                key={deposit.id}
                                deposit={deposit}
                                index={((currentPage - 1) * 20) + i + 1}
                            />
                        ))
                    )}
                </div>

                {/* ── Pagination footer ───────────────────────────────── */}
                {totalPages > 1 && (
                    <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 dark:border-gray-800
                        bg-gray-50 dark:bg-gray-900/60 flex items-center justify-between gap-3">

                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Page {currentPage} of {totalPages}
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchDeposits(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                                    hover:bg-gray-200 dark:hover:bg-gray-700
                                    disabled:opacity-40 disabled:cursor-not-allowed transition">
                                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>

                            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                .reduce((acc, p, i, arr) => {
                                    if (i > 0 && arr[i - 1] !== p - 1) acc.push('…');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    p === '…' ? (
                                        <span key={`e${i}`} className="text-xs text-gray-400 px-1">…</span>
                                    ) : (
                                        <button key={p}
                                            onClick={() => fetchDeposits(p)}
                                            disabled={loading}
                                            className={`w-8 h-8 rounded-lg text-xs font-semibold transition
                                                ${p === currentPage
                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                    : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}>
                                            {p}
                                        </button>
                                    )
                                )
                            }

                            <button
                                onClick={() => fetchDeposits(currentPage + 1)}
                                disabled={currentPage === totalPages || loading}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                                    hover:bg-gray-200 dark:hover:bg-gray-700
                                    disabled:opacity-40 disabled:cursor-not-allowed transition">
                                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
