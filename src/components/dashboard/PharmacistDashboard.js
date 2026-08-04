import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ShoppingCart, DollarSign, TrendingUp, CreditCard,
    Users, UserCheck, Wallet,
    Pill, ClipboardList, CheckCircle2, XCircle,
    FileText, AlertCircle,
    Package, PackageX, AlertTriangle, Clock, CalendarDays,
    RefreshCw, ShieldAlert
} from 'lucide-react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { API_BASE_URL } from '../general/constants';

// ─── Detect Tailwind's `dark` class on <html> so skeletons match the theme ────
function useIsDarkMode() {
    const [isDark, setIsDark] = useState(
        () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    );

    useEffect(() => {
        const root = document.documentElement;
        const update = () => setIsDark(root.classList.contains('dark'));
        update();

        const observer = new MutationObserver(update);
        observer.observe(root, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return isDark;
}

// ─── Small stat card ───────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor, loading }) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-gray-100 dark:ring-gray-800 p-5 flex items-start gap-4 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${iconBg}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.12em] mb-1.5">{label}</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white leading-none tabular-nums">
                    {loading ? <Skeleton width={60} /> : (value ?? '—')}
                </p>
                {sub && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                        {loading ? <Skeleton width={80} /> : sub}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Section wrapper: header + card shell around a group of stats ─────────────
function Section({ icon: Icon, label, color, children, extra }) {
    return (
        <section className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-gray-100 dark:ring-gray-800 shadow-sm overflow-hidden">
            <div className={`flex items-center gap-3 px-6 py-4 ${color}`}>
                <Icon className="w-5 h-5 text-white" />
                <h2 className="text-xs font-bold text-white uppercase tracking-[0.15em]">{label}</h2>
            </div>
            <div className="p-6">
                <div className="space-y-4">
                    {children}
                </div>
                {extra}
            </div>
        </section>
    );
}

// ─── Status pill — covers payment statuses + visit/invoice statuses ───────────
const STATUS_COLORS = {
    // Payment statuses
    paid:            'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    partial:         'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    unpaid:          'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

function StatusPill({ status, count, loading }) {
    const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    return (
        <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${cls} ring-1 ring-inset ring-black/5 dark:ring-white/5`}>
            <span className="text-xs font-semibold capitalize leading-none">{status?.replace(/_/g, ' ') ?? '—'}</span>
            <span className="text-sm font-black ml-2 tabular-nums">
                {loading ? <Skeleton width={24} /> : count}
            </span>
        </div>
    );
}

// ─── Format a monetary amount with commas and 2 decimal places ────────────────
const fmtAmount = (n) =>
    n == null ? '—' : Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Table used inside stock-alert sub-blocks ─────────────────────────────────
function StockTable({ headers, rows, loading, skeletonRows = 3 }) {
    if (loading) {
        return (
            <div className="space-y-1.5">
                {Array.from({ length: skeletonRows }).map((_, i) => (
                    <Skeleton key={i} height={36} className="rounded-lg" />
                ))}
            </div>
        );
    }
    if (!rows || rows.length === 0) {
        return <p className="text-xs text-gray-400 dark:text-gray-500 py-1">No items.</p>;
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                        {headers.map((h) => (
                            <th
                                key={h.key}
                                className={`text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pb-2 ${h.align === 'right' ? 'text-right' : 'text-left'}`}
                            >
                                {h.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {rows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                            {headers.map((h) => (
                                <td
                                    key={h.key}
                                    className={`py-2 text-xs ${h.align === 'right' ? 'text-right' : ''} ${h.className ?? 'text-gray-600 dark:text-gray-300'}`}
                                >
                                    {row[h.key] ?? '—'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════════
//  PharmacistDashboard
// ══════════════════════════════════════════════════════════════════════════════
export default function PharmacistDashboard() {
    const token         = localStorage.getItem('access_token');
    const userRoleId    = useSelector((state) => state.auth?.user?.data?.user?.role_id);
    const isPharmacist  = (userRoleId || []).map(Number).includes(5);
    const isDark        = useIsDarkMode();

    const [data, setData]               = useState(null);
    const [loading, setLoading]         = useState(true);
    const [lastFetched, setLastFetched] = useState(null);

    const fetchOverview = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}dashboard/getPharmacistOverview`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            setData(res.data.data);
            setLastFetched(new Date());
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load dashboard data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOverview(); }, []);

    // Non-pharmacists see an access-denied message
    if (!isPharmacist) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-6">
                <div className="text-center max-w-xs w-full">
                    <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6 shadow-lg ring-1 ring-red-100 dark:ring-red-900/50">
                        <ShieldAlert className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Access Denied</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">This page is restricted to pharmacists.</p>
                </div>
            </div>
        );
    }

    const sales   = data?.sales          ?? {};
    const cust    = data?.customers       ?? {};
    const rx      = data?.prescriptions  ?? {};
    const inv     = data?.credit_invoices ?? {};
    const alerts  = data?.stock_alerts   ?? {};

    const lowStock     = alerts?.low_stock     ?? { count: 0, items: [] };
    const outOfStock   = alerts?.out_of_stock  ?? { count: 0, items: [] };
    const expiringSoon = alerts?.expiring_soon ?? { count: 0, items: [] };
    const expired      = alerts?.expired       ?? { count: 0, items: [] };

    return (
        <SkeletonTheme
            baseColor={isDark ? '#374151' : '#e5e7eb'}
            highlightColor={isDark ? '#4b5563' : '#f3f4f6'}
        >
            <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

                {/* ── Page header ── */}
                <div className="relative rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 to-teal-800" />
                    <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-teal-300/10 pointer-events-none" />
                    <div className="absolute right-20 bottom-0 w-24 h-24 rounded-full bg-emerald-300/10 pointer-events-none" />
                    <div className="relative px-7 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1.5 bg-white/10 text-xs font-semibold text-white/80 px-3 py-1 rounded-full border border-white/10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                                    Live Overview
                                </span>
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Pharmacist Dashboard</h1>
                            <p className="text-sm text-white/50 mt-1">
                                Branch overview &bull;{' '}
                                {lastFetched ? `Updated ${lastFetched.toLocaleTimeString()}` : 'Loading…'}
                            </p>
                        </div>
                        <button
                            onClick={fetchOverview}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                                bg-white/10 hover:bg-white/20 border border-white/15 text-white
                                transition-all duration-200 disabled:opacity-40 self-start sm:self-auto"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* ══ SALES ══ */}
                <Section
                    icon={ShoppingCart}
                    label="Sales"
                    color="bg-emerald-600"
                    extra={(loading || (sales.by_payment_status && Object.keys(sales.by_payment_status).length > 0)) && (
                        <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                                Sales by Payment Status
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {loading
                                    ? [1, 2, 3].map(i => <Skeleton key={i} height={44} className="rounded-xl" />)
                                    : Object.entries(sales.by_payment_status ?? {}).map(([status, count]) => (
                                        <StatusPill key={status} status={status} count={count} loading={loading} />
                                    ))
                                }
                            </div>
                        </div>
                    )}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            icon={ShoppingCart}
                            label="Sales Today"
                            value={loading ? null : (sales.today?.count ?? '—')}
                            sub={loading ? null : `Total: ${fmtAmount(sales.today?.total_amount)}`}
                            loading={loading}
                            iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                            iconColor="text-emerald-600 dark:text-emerald-400"
                        />
                        <StatCard
                            icon={CalendarDays}
                            label="Sales This Month"
                            value={loading ? null : (sales.this_month?.count ?? '—')}
                            sub={loading ? null : `Total: ${fmtAmount(sales.this_month?.total_amount)}`}
                            loading={loading}
                            iconBg="bg-green-100 dark:bg-green-900/40"
                            iconColor="text-green-600 dark:text-green-400"
                        />
                        <StatCard
                            icon={DollarSign}
                            label="Total Outstanding Balance"
                            value={loading ? null : fmtAmount(sales.total_outstanding_balance)}
                            loading={loading}
                            iconBg="bg-red-100 dark:bg-red-900/40"
                            iconColor="text-red-600 dark:text-red-400"
                        />
                    </div>
                </Section>

                {/* ══ CUSTOMERS ══ */}
                <Section icon={Users} label="Customers" color="bg-purple-600">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <StatCard
                            icon={Users}
                            label="Total Customers"
                            value={cust.total_customers}
                            loading={loading}
                            iconBg="bg-purple-100 dark:bg-purple-900/40"
                            iconColor="text-purple-600 dark:text-purple-400"
                        />
                        <StatCard
                            icon={UserCheck}
                            label="Active Customers"
                            value={cust.active_customers}
                            loading={loading}
                            iconBg="bg-violet-100 dark:bg-violet-900/40"
                            iconColor="text-violet-600 dark:text-violet-400"
                        />
                        <StatCard
                            icon={CreditCard}
                            label="Credit Enabled"
                            value={cust.credit_enabled_customers}
                            loading={loading}
                            iconBg="bg-indigo-100 dark:bg-indigo-900/40"
                            iconColor="text-indigo-600 dark:text-indigo-400"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard
                            icon={Wallet}
                            label="Total Deposit Balance"
                            value={loading ? null : fmtAmount(cust.total_deposit_balance)}
                            loading={loading}
                            iconBg="bg-teal-100 dark:bg-teal-900/40"
                            iconColor="text-teal-600 dark:text-teal-400"
                        />
                        <StatCard
                            icon={TrendingUp}
                            label="Outstanding Sale Balance"
                            value={loading ? null : fmtAmount(cust.total_outstanding_sale_balance)}
                            loading={loading}
                            iconBg="bg-rose-100 dark:bg-rose-900/40"
                            iconColor="text-rose-600 dark:text-rose-400"
                        />
                    </div>
                </Section>

                {/* ══ PRESCRIPTIONS ══ */}
                <Section icon={Pill} label="Prescriptions" color="bg-blue-600">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={ClipboardList}
                            label="Pending"
                            value={rx.pending}
                            loading={loading}
                            iconBg="bg-amber-100 dark:bg-amber-900/40"
                            iconColor="text-amber-600 dark:text-amber-400"
                        />
                        <StatCard
                            icon={CheckCircle2}
                            label="Dispensed Today"
                            value={rx.dispensed_today}
                            loading={loading}
                            iconBg="bg-green-100 dark:bg-green-900/40"
                            iconColor="text-green-600 dark:text-green-400"
                        />
                        <StatCard
                            icon={CalendarDays}
                            label="Dispensed This Month"
                            value={rx.dispensed_this_month}
                            loading={loading}
                            iconBg="bg-blue-100 dark:bg-blue-900/40"
                            iconColor="text-blue-600 dark:text-blue-400"
                        />
                        <StatCard
                            icon={XCircle}
                            label="Cancelled"
                            value={rx.cancelled}
                            loading={loading}
                            iconBg="bg-red-100 dark:bg-red-900/40"
                            iconColor="text-red-600 dark:text-red-400"
                        />
                    </div>
                </Section>

                {/* ══ CREDIT INVOICES ══ */}
                <Section icon={FileText} label="Credit Invoices" color="bg-indigo-600">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <StatCard
                            icon={FileText}
                            label="Draft"
                            value={inv.draft}
                            loading={loading}
                            iconBg="bg-gray-100 dark:bg-gray-700"
                            iconColor="text-gray-500 dark:text-gray-400"
                        />
                        <StatCard
                            icon={TrendingUp}
                            label="Issued"
                            value={inv.issued}
                            loading={loading}
                            iconBg="bg-blue-100 dark:bg-blue-900/40"
                            iconColor="text-blue-600 dark:text-blue-400"
                        />
                        <StatCard
                            icon={CreditCard}
                            label="Partially Paid"
                            value={inv.partially_paid}
                            loading={loading}
                            iconBg="bg-amber-100 dark:bg-amber-900/40"
                            iconColor="text-amber-600 dark:text-amber-400"
                        />
                        <StatCard
                            icon={CheckCircle2}
                            label="Paid"
                            value={inv.paid}
                            loading={loading}
                            iconBg="bg-green-100 dark:bg-green-900/40"
                            iconColor="text-green-600 dark:text-green-400"
                        />
                        <StatCard
                            icon={AlertCircle}
                            label="Overdue"
                            value={inv.overdue}
                            loading={loading}
                            iconBg="bg-red-100 dark:bg-red-900/40"
                            iconColor="text-red-600 dark:text-red-400"
                        />
                        <StatCard
                            icon={XCircle}
                            label="Cancelled"
                            value={inv.cancelled}
                            loading={loading}
                            iconBg="bg-gray-100 dark:bg-gray-700"
                            iconColor="text-gray-500 dark:text-gray-400"
                        />
                    </div>
                    {/* Total balance due — separated to give it visual weight */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard
                            icon={DollarSign}
                            label="Total Balance Due (excl. drafts)"
                            value={loading ? null : fmtAmount(inv.total_balance_due)}
                            loading={loading}
                            iconBg="bg-red-100 dark:bg-red-900/40"
                            iconColor="text-red-600 dark:text-red-400"
                        />
                    </div>
                </Section>

                {/* ══ STOCK ALERTS ══ */}
                <Section icon={AlertTriangle} label="Stock Alerts" color="bg-red-600">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* ── Low Stock ── */}
                        <div className="space-y-3">
                            <StatCard
                                icon={AlertTriangle}
                                label="Low Stock Products"
                                value={lowStock.count}
                                sub="Stock at or below minimum order level"
                                loading={loading}
                                iconBg="bg-amber-100 dark:bg-amber-900/40"
                                iconColor="text-amber-600 dark:text-amber-400"
                            />
                            <StockTable
                                loading={loading}
                                headers={[
                                    { key: 'product_name',       label: 'Product',    align: 'left',  className: 'font-medium text-gray-700 dark:text-gray-200 pr-2' },
                                    { key: 'total_quantity',     label: 'Qty',        align: 'right', className: 'text-right text-amber-700 dark:text-amber-300 font-semibold' },
                                    { key: 'minimum_order_level', label: 'Min Level', align: 'right', className: 'text-right text-gray-500 dark:text-gray-400' },
                                ]}
                                rows={lowStock.items}
                            />
                        </div>

                        {/* ── Out of Stock ── */}
                        <div className="space-y-3">
                            <StatCard
                                icon={PackageX}
                                label="Out of Stock Products"
                                value={outOfStock.count}
                                sub="Zero quantity across all batches"
                                loading={loading}
                                iconBg="bg-red-100 dark:bg-red-900/40"
                                iconColor="text-red-600 dark:text-red-400"
                            />
                            <StockTable
                                loading={loading}
                                headers={[
                                    { key: 'product_name',   label: 'Product', align: 'left',  className: 'font-medium text-gray-700 dark:text-gray-200 pr-2' },
                                    { key: 'total_quantity', label: 'Qty',     align: 'right', className: 'text-right text-red-600 dark:text-red-400 font-semibold' },
                                ]}
                                rows={outOfStock.items}
                            />
                        </div>

                        {/* ── Expiring Soon ── */}
                        <div className="space-y-3">
                            <StatCard
                                icon={Clock}
                                label="Expiring Soon (≤ 30 days)"
                                value={expiringSoon.count}
                                sub="Batches with stock expiring within 30 days"
                                loading={loading}
                                iconBg="bg-amber-100 dark:bg-amber-900/40"
                                iconColor="text-amber-600 dark:text-amber-400"
                            />
                            <StockTable
                                loading={loading}
                                headers={[
                                    { key: 'product_name',       label: 'Product', align: 'left',  className: 'font-medium text-gray-700 dark:text-gray-200 pr-2' },
                                    { key: 'batch_number',        label: 'Batch',   align: 'left',  className: 'text-gray-500 dark:text-gray-400' },
                                    { key: 'expiry_date',         label: 'Expires', align: 'right', className: 'text-right text-amber-700 dark:text-amber-300 font-semibold' },
                                    { key: 'quantity_in_base_uom', label: 'Qty',   align: 'right', className: 'text-right text-gray-500 dark:text-gray-400' },
                                ]}
                                rows={expiringSoon.items}
                            />
                        </div>

                        {/* ── Expired ── */}
                        <div className="space-y-3">
                            <StatCard
                                icon={Package}
                                label="Expired (in stock)"
                                value={expired.count}
                                sub="Sellable batches past their expiry date"
                                loading={loading}
                                iconBg="bg-red-100 dark:bg-red-900/40"
                                iconColor="text-red-600 dark:text-red-400"
                            />
                            <StockTable
                                loading={loading}
                                headers={[
                                    { key: 'product_name',       label: 'Product', align: 'left',  className: 'font-medium text-gray-700 dark:text-gray-200 pr-2' },
                                    { key: 'batch_number',        label: 'Batch',   align: 'left',  className: 'text-gray-500 dark:text-gray-400' },
                                    { key: 'expiry_date',         label: 'Expired', align: 'right', className: 'text-right text-red-600 dark:text-red-400 font-semibold' },
                                    { key: 'quantity_in_base_uom', label: 'Qty',   align: 'right', className: 'text-right text-gray-500 dark:text-gray-400' },
                                ]}
                                rows={expired.items}
                            />
                        </div>

                    </div>
                </Section>

            </div>
        </SkeletonTheme>
    );
}
