import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Select from "react-select";
import { API_BASE_URL } from "../general/constants";
import { getSelectClassNames } from "../general/searchSelectStyles";

// ─── constants ────────────────────────────────────────────────────────────────

const token = () => localStorage.getItem("access_token");

const ACTION_OPTIONS = [
    { value: "", label: "All Actions" },
    { value: "created", label: "Created" },
    { value: "updated", label: "Updated" },
    { value: "deleted", label: "Deleted" },
];

const ACTION_META = {
    created: {
        label: "CREATED",
        pill: "!bg-emerald-100 dark:!bg-emerald-900/30 !text-emerald-700 dark:!text-emerald-300 !border !border-emerald-300 dark:!border-emerald-700",
        dot: "bg-emerald-500",
        bar: "bg-gradient-to-r from-emerald-400 to-teal-500",
        card: "!border-emerald-200 dark:!border-emerald-900/50",
    },
    updated: {
        label: "UPDATED",
        pill: "!bg-blue-100 dark:!bg-blue-900/30 !text-blue-700 dark:!text-blue-300 !border !border-blue-300 dark:!border-blue-700",
        dot: "bg-blue-500",
        bar: "bg-gradient-to-r from-blue-400 to-indigo-500",
        card: "!border-gray-200 dark:!border-gray-700",
    },
    deleted: {
        label: "DELETED",
        pill: "!bg-red-100 dark:!bg-red-900/30 !text-red-700 dark:!text-red-300 !border !border-red-300 dark:!border-red-800",
        dot: "bg-red-500",
        bar: "bg-gradient-to-r from-red-400 to-red-600",
        card: "!border-red-200 dark:!border-red-900/50",
    },
};

const MODEL_ICONS = {
    Patient: "🧑‍⚕️",
    PatientLabTest: "🧪",
    PatientTriage: "🩺",
    PatientVisit: "🏥",
    Product: "💊",
    ProductBatch: "📦",
    PurchaseOrder: "📋",
    Appointment: "📅",
    User: "👤",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Merge snapshot entries so FK ID fields display the resolved name when
 * a companion `_name` field was injected by the backend.
 */
function mergeSnapshotNames(snapshot) {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return [];

    const keys = Object.keys(snapshot);
    const nameKeys = new Set(keys.filter((k) => k.endsWith("_name")));
    const result = [];

    for (const [key, val] of Object.entries(snapshot)) {
        if (nameKeys.has(key)) {
            const base = key.slice(0, -5);
            if (keys.includes(base + "_id") || keys.includes(base)) continue;
        }

        if (key.endsWith("_id")) {
            const nameKey = key.slice(0, -3) + "_name";
            if (nameKeys.has(nameKey)) {
                result.push([key, `${snapshot[nameKey]} (ID: ${val})`]);
                continue;
            }
        }

        const potentialNameKey = key + "_name";
        if (nameKeys.has(potentialNameKey)) {
            result.push([key, `${snapshot[potentialNameKey]} (ID: ${val})`]);
            continue;
        }

        result.push([key, val]);
    }

    return result;
}

function today() {
    return new Date().toISOString().split("T")[0];
}

function sevenDaysAgo() {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
}

// UTC → EAT (+3)
function formatTime(time) {
    if (!time) return "";
    const [h, m] = time.split(":");
    const eatHour = (parseInt(h, 10) + 3) % 24;
    const ampm = eatHour >= 12 ? "PM" : "AM";
    return `${eatHour % 12 || 12}:${m} ${ampm}`;
}

// ─── RenderValue ──────────────────────────────────────────────────────────────

function RenderValue({ val }) {
    if (val === null || val === undefined)
        return <span className="!text-gray-400 !italic">—</span>;

    if (Array.isArray(val)) {
        if (val.length === 0)
            return <span className="!text-gray-400 !italic">empty list</span>;
        return (
            <div className="!mt-1 !space-y-1">
                {val.map((item, i) => (
                    <div
                        key={i}
                        className="!bg-white/60 dark:!bg-black/20 !rounded !px-2 !py-1 !text-xs !text-gray-700 dark:!text-gray-300 !border !border-gray-200 dark:!border-gray-600 dashboard"
                    >
                        {typeof item === "object" && item !== null ? (
                            <div className="!flex !flex-wrap !gap-x-4 !gap-y-0.5">
                                {Object.entries(item).map(([k, v]) => (
                                    <span key={k}>
                                        <span className="!text-gray-400">{k}: </span>
                                        <span className="!font-medium">
                                            {v !== null && v !== undefined ? String(v) : "—"}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            String(item)
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (typeof val === "object") {
        return (
            <pre className="!text-xs !text-gray-700 dark:!text-gray-300 !whitespace-pre-wrap !break-all !mt-1 !max-h-32 !overflow-auto dashboard">
                {JSON.stringify(val, null, 2)}
            </pre>
        );
    }

    return <span className="!break-all">{String(val)}</span>;
}

// ─── ChangeDiff ───────────────────────────────────────────────────────────────

function ChangeDiff({ changes, action, modelId }) {
    if (!changes)
        return <p className="!text-xs !text-gray-400 !italic">No change details recorded.</p>;

    // ── CREATED ──────────────────────────────────────────────────────────────
    if (action === "created" && changes.new) {
        const entries = mergeSnapshotNames(changes.new).filter(
            ([, v]) => v !== null && v !== undefined && v !== ""
        );
        if (!entries.length)
            return <p className="!text-xs !text-gray-400 !italic">No fields recorded.</p>;
        return (
            <div>
                <p className="!text-xs !font-bold !text-emerald-600 dark:!text-emerald-400 !uppercase !tracking-widest !mb-3">
                    New record snapshot <strong className="!text-red-600 dark:!text-red-400">#{modelId}</strong>
                </p>
                <div className="!grid !grid-cols-1 sm:!grid-cols-2 !gap-2">
                    {entries.map(([key, val]) => (
                        <div key={key} className="!rounded-lg !bg-emerald-50 dark:!bg-emerald-900/10 !border !border-emerald-200 dark:!border-emerald-800 !px-3 !py-2">
                            <p className="!text-xs !font-semibold !text-emerald-600 dark:!text-emerald-400 !uppercase !tracking-wider !mb-0.5">
                                {key.replace(/_/g, " ")}
                            </p>
                            <div className="!text-sm !text-gray-800 dark:!text-gray-200">
                                <RenderValue val={val} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── DELETED ───────────────────────────────────────────────────────────────
    if (action === "deleted" && changes.deleted) {
        const entries = mergeSnapshotNames(changes.deleted).filter(
            ([, v]) => v !== null && v !== undefined
        );
        return (
            <div>
                <p className="!text-xs !font-bold !text-red-500 dark:!text-red-400 !uppercase !tracking-widest !mb-3">
                    Deleted record snapshot <strong className="!text-red-600 dark:!text-red-400">#{modelId}</strong>
                </p>
                <div className="!grid !grid-cols-1 sm:!grid-cols-2 !gap-2">
                    {entries.map(([key, val]) => (
                        <div key={key} className="!rounded-lg !bg-red-50 dark:!bg-red-900/10 !border !border-red-200 dark:!border-red-800 !px-3 !py-2">
                            <p className="!text-xs !font-semibold !text-red-500 dark:!text-red-400 !uppercase !tracking-wider !mb-0.5">
                                {key.replace(/_/g, " ")}
                            </p>
                            <div className="!text-sm !text-gray-800 dark:!text-gray-200">
                                <RenderValue val={val} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── UPDATED ───────────────────────────────────────────────────────────────
    const diffEntries = Object.entries(changes).filter(
        ([k]) => k !== "new" && k !== "deleted"
    );

    if (!diffEntries.length && changes.new) {
        const entries = Object.entries(changes.new).filter(([, v]) => v !== null && v !== undefined);
        return (
            <div>
                <p className="!text-xs !font-bold !text-blue-600 dark:!text-blue-400 !uppercase !tracking-widest !mb-3">
                    Updated fields <strong className="!text-red-600 dark:!text-red-400">#{modelId}</strong>
                </p>
                <div className="!grid !grid-cols-1 sm:!grid-cols-2 !gap-2">
                    {entries.map(([key, val]) => (
                        <div key={key} className="!rounded-lg !bg-blue-50 dark:!bg-blue-900/10 !border !border-blue-200 dark:!border-blue-800 !px-3 !py-2">
                            <p className="!text-xs !font-semibold !text-blue-600 dark:!text-blue-400 !uppercase !tracking-wider !mb-0.5">
                                {key.replace(/_/g, " ")}
                            </p>
                            <div className="!text-sm !text-gray-800 dark:!text-gray-200">
                                <RenderValue val={val} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!diffEntries.length)
        return <p className="!text-xs !text-gray-400 !italic">No field-level changes recorded.</p>;

    return (
        <div>
            <p className="!text-xs !font-bold !text-blue-600 dark:!text-blue-400 !uppercase !tracking-widest !mb-3">
                Changed fields <strong className="!text-red-600 dark:!text-red-400">#{modelId}</strong>
            </p>
            <div className="!space-y-2">
                {diffEntries.map(([field, diff]) => {
                    const isStandardDiff =
                        diff &&
                        typeof diff === "object" &&
                        !Array.isArray(diff) &&
                        ("old" in diff || "new" in diff);

                    return (
                        <div key={field} className="!rounded-lg !bg-gray-50 dark:!bg-gray-700/40 !border !border-gray-200 dark:!border-gray-600 !px-3 !py-2">
                            <p className="!text-xs !font-bold !text-gray-500 dark:!text-gray-400 !uppercase !tracking-widest !mb-2">
                                {field.replace(/_/g, " ")}
                            </p>

                            {isStandardDiff ? (
                                <>
                                    <div className="!flex !items-start !gap-2 !flex-wrap">
                                        <div className="!flex-1 !min-w-[120px]">
                                            <p className="!text-xs !text-red-400 !font-semibold !mb-1">Before</p>
                                            <div className="!bg-red-50 dark:!bg-red-900/20 !text-red-700 dark:!text-red-300 !border !border-red-200 dark:!border-red-800 !rounded-md !px-2 !py-1.5 !text-sm !break-all">
                                                <RenderValue val={diff.old} />
                                            </div>
                                        </div>
                                        <span className="!text-gray-400 !font-mono !text-lg !mt-6">→</span>
                                        <div className="!flex-1 !min-w-[120px]">
                                            <p className="!text-xs !text-emerald-500 !font-semibold !mb-1">After</p>
                                            <div className="!bg-emerald-50 dark:!bg-emerald-900/20 !text-emerald-700 dark:!text-emerald-300 !border !border-emerald-200 dark:!border-emerald-800 !rounded-md !px-2 !py-1.5 !text-sm !font-semibold !break-all">
                                                <RenderValue val={diff.new} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Numeric delta — only shown for ProductBatch quantity fields */}
                                    {diff.difference !== undefined && (
                                        <span className={
                                            "!inline-block !mt-2 !text-xs !font-bold !rounded-full !px-2.5 !py-0.5 " +
                                            (diff.difference > 0
                                                ? "!text-emerald-600 dark:!text-emerald-400 !bg-emerald-100 dark:!bg-emerald-900/30"
                                                : "!text-red-500 dark:!text-red-400 !bg-red-100 dark:!bg-red-900/30")
                                        }>
                                            {diff.difference > 0 ? "+" + diff.difference : diff.difference}
                                        </span>
                                    )}

                                    {diff.comment && (
                                        <p className="!text-xs !text-gray-400 dark:!text-gray-500 !mt-1.5 !italic">
                                            {diff.comment}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <div className="!text-sm !text-gray-800 dark:!text-gray-200">
                                    <RenderValue val={diff} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── LogCard ──────────────────────────────────────────────────────────────────

function LogCard({ entry }) {
    const [expanded, setExpanded] = useState(false);
    const actionKey  = entry.action || "updated";
    const meta       = ACTION_META[actionKey] || ACTION_META.updated;
    const modelIcon  = MODEL_ICONS[entry.model_type] || "📋";

    const actorName =
        entry.user?.name
            ? entry.user.name
            : entry.user_id
                ? "User #" + entry.user_id
                : "Unknown";

    const branchName = entry.branch?.name ?? null;

    const dateStamp =
        entry.year +
        "/" +
        String(entry.month).padStart(2, "0") +
        "/" +
        String(entry.day).padStart(2, "0");

    return (
        <div className={
            "!rounded-2xl !border !bg-white dark:!bg-gray-800 !shadow-sm hover:!shadow-md !transition-all !duration-200 !overflow-hidden " +
            meta.card
        }>
            <div className={"!h-1 !w-full " + meta.bar} />

            <div className="!p-4 sm:!p-5">
                <div className="!flex !items-start !justify-between !gap-3 !flex-wrap">
                    <div className="!flex !items-center !gap-3 !min-w-0">
                        <div className="!w-10 !h-10 !rounded-xl !flex !items-center !justify-center !text-xl !bg-gray-100 dark:!bg-gray-700 !shrink-0">
                            {modelIcon}
                        </div>
                        <div className="!min-w-0">
                            <div className="!flex !items-center !gap-2 !flex-wrap">
                                <span className="!font-bold !text-gray-900 dark:!text-white !text-base">
                                    <strong>{entry.model_type}</strong>
                                </span>
                                <span className="!text-red-400 dark:!text-red-500 !text-sm !font-mono font-bold">
                                    <strong>#{entry.model_id}</strong>
                                </span>
                                <span className={
                                    "!inline-flex !items-center !gap-1 !rounded-full !px-2.5 !py-0.5 !text-xs !font-bold !tracking-wide " +
                                    meta.pill
                                }>
                                    <span className={"!w-1.5 !h-1.5 !rounded-full " + meta.dot} />
                                    {meta.label}
                                </span>
                            </div>

                            <div className="!flex !items-center !gap-2 !mt-1 !flex-wrap">
                                <span className="!text-xs !text-gray-500 dark:!text-gray-400">
                                    👤 {actorName}
                                </span>
                                {branchName && (
                                    <>
                                        <span className="!text-gray-300 dark:!text-gray-600">·</span>
                                        <span className="!text-xs !text-gray-500 dark:!text-gray-400">
                                            🏢 {branchName}
                                        </span>
                                    </>
                                )}
                                <span className="!text-gray-300 dark:!text-gray-600">·</span>
                                <span className="!text-xs !text-gray-500 dark:!text-gray-400">
                                    🕐 {dateStamp} {formatTime(entry.time)}
                                </span>
                                <span className="!text-gray-300 dark:!text-gray-600">·</span>
                                <span className="!text-xs !font-mono !text-gray-400 dark:!text-gray-500">
                                    log#{entry.id}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setExpanded(!expanded)}
                        className={
                            "!shrink-0 !rounded-xl !px-3 !py-1.5 !text-xs !font-semibold !border !transition-all !duration-200 " +
                            (expanded
                                ? "!bg-gray-100 dark:!bg-gray-700 !text-gray-700 dark:!text-gray-300 !border-gray-300 dark:!border-gray-600"
                                : "!bg-white dark:!bg-gray-800 !text-gray-500 dark:!text-gray-400 !border-gray-200 dark:!border-gray-700 hover:!bg-gray-50 dark:hover:!bg-gray-700")
                        }
                    >
                        {expanded ? "▲ Collapse" : "▼ Details"}
                    </button>
                </div>

                {expanded && (
                    <div className="!mt-4 !border-t !border-gray-100 dark:!border-gray-700 !pt-4">
                        <ChangeDiff changes={entry.changes} action={actionKey} modelId={entry.model_id} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function GeneralActivityLogsViewer() {
    const [filters, setFilters] = useState({
        date_from: sevenDaysAgo(),
        date_to: today(),
        user_id: null,
        model: null,
        branch_id: null,
        action: null,
        per_page: 20,
    });

    const [users, setUsers]               = useState([]);
    const [branches, setBranches]         = useState([]);
    const [loggableModels, setLoggableModels] = useState([]);

    const [logs, setLogs]       = useState({});
    const [meta, setMeta]       = useState(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError]     = useState(null);
    const [fetched, setFetched] = useState(false);

    const [selUser,   setSelUser]   = useState(null);
    const [selModel,  setSelModel]  = useState(null);
    const [selBranch, setSelBranch] = useState(null);
    const [selAction, setSelAction] = useState(null);

    // ── load dropdown options once ─────────────────────────────────────────────
    useEffect(() => {
        const headers = { Authorization: "Bearer " + token() };

        // Users — getUserDetails returns { status, users: [{id, name, ...}] }
        axios
            .get(API_BASE_URL + "getUsersDetails", { headers })
            .then((r) => {
                const mapped = (r.data.users || []).map((u) => ({ value: u.id, label: u.name }));
                setUsers(mapped);
            })
            .catch(console.error);

        // Branches — getBranches returns { success, branches: [{id, name, ...}] }
        axios
            .get(API_BASE_URL + "config/getBranches", { headers })
            .then((r) => {
                const list = r.data.branches || [];
                setBranches(list.map((b) => ({ value: b.id, label: b.name })));
            })
            .catch(console.error);

        // Loggable models — returns { status, data: ['Patient', 'User', ...] }
        axios
            .get(API_BASE_URL + "logs/getActivityLoggableModels", { headers })
            .then((r) => {
                const list = r.data?.data || [];
                setLoggableModels(list.map((m) => ({ value: m, label: m })));
            })
            .catch(console.error);
    }, []);

    // ── fetch logs ─────────────────────────────────────────────────────────────
    const fetchLogs = useCallback(async (pg = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = { page: pg, per_page: filters.per_page };
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to)   params.date_to   = filters.date_to;
            if (filters.user_id)   params.user_id   = filters.user_id;
            if (filters.branch_id) params.branch_id = filters.branch_id;
            if (filters.model)     params.model      = filters.model;
            if (filters.action)    params.action     = filters.action;

            const res = await axios.get(API_BASE_URL + "logs/getGeneralActivityLogs", {
                headers: { Authorization: "Bearer " + token() },
                params,
            });

            setLogs(res.data.data || {});
            setMeta(res.data.meta || null);
            setFetched(true);
        } catch (e) {
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch logs. Check your filters and try again."
            );
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // ── export ─────────────────────────────────────────────────────────────────
    const handleExport = async () => {
        setExporting(true);
        setError(null);
        try {
            const params = {};
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to)   params.date_to   = filters.date_to;
            if (filters.user_id)   params.user_id   = filters.user_id;
            if (filters.branch_id) params.branch_id = filters.branch_id;
            if (filters.model)     params.model      = filters.model;
            if (filters.action)    params.action     = filters.action;

            const res = await axios.get(API_BASE_URL + "logs/exportActivityLogs", {
                headers:      { Authorization: "Bearer " + token() },
                params,
                responseType: "blob",
            });

            const url  = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href  = url;
            link.setAttribute("download", "activity_logs_" + new Date().toISOString().split("T")[0] + ".xlsx");
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || "Export failed. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    const flattenLogs = (logsObj) =>
        Object.entries(logsObj).flatMap(([, byRecordId]) => {
            if (Array.isArray(byRecordId)) return byRecordId;
            if (byRecordId && typeof byRecordId === "object") {
                return Object.entries(byRecordId).flatMap(([, arr]) =>
                    Array.isArray(arr) ? arr : []
                );
            }
            return [];
        });

    const allEntries = flattenLogs(logs);

    const modelBreakdown = Object.entries(logs).map(([modelType, byRecordId]) => {
        let count = 0;
        if (Array.isArray(byRecordId)) {
            count = byRecordId.length;
        } else if (byRecordId && typeof byRecordId === "object") {
            count = Object.values(byRecordId).reduce(
                (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0
            );
        }
        return { modelType, count };
    });

    const handleReset = () => {
        setFilters({ date_from: null, date_to: null, user_id: null, model: null, branch_id: null, action: null, per_page: 20 });
        setSelUser(null); setSelModel(null); setSelBranch(null); setSelAction(null);
        setLogs({}); setMeta(null); setFetched(false); setError(null);
    };

    // ── render ─────────────────────────────────────────────────────────────────
    return (
        <div className="!min-h-screen !bg-gray-50 dark:!bg-gray-900 dashboard">

            {/* page header */}
            <div className="!bg-white dark:!bg-gray-800 !border-b !border-gray-200 dark:!border-gray-700 !px-4 sm:!px-8 !py-6">
                <div className="!max-w-7xl !mx-auto !flex !items-center !justify-between !flex-wrap !gap-4">
                    <div>
                        <h1 className="!text-2xl !font-extrabold !text-gray-900 dark:!text-white !tracking-tight">
                            General System Activity Logs
                        </h1>
                        <p className="!text-sm !text-gray-500 dark:!text-gray-400 !mt-0.5">
                            Audit logs grouped by entity and arranged chronologically from the earliest created events to the latest updates and actions.
                        </p>

                        <div className="!mt-2 !rounded-xl !border !border-gray-200 dark:!border-gray-700 !bg-gray-50 dark:!bg-gray-800/60 !px-4 !py-3 !max-w-3xl">
                            <div className="!space-y-1.5 !text-sm !text-gray-600 dark:!text-gray-300">
                                <p className="!mb-0">
                                    <span className="!inline-flex !items-center !gap-1 !rounded-full !px-2 !py-0.5 !text-xs !font-bold !bg-emerald-100 dark:!bg-emerald-900/30 !text-emerald-700 dark:!text-emerald-300 !border !border-emerald-300 dark:!border-emerald-700 !mr-1.5">
                                        <span className="!w-1.5 !h-1.5 !rounded-full !bg-emerald-500" />Created
                                    </span>
                                    displays the full entity snapshot captured at the time the record was created.
                                </p>
                                <p className="!mb-0">
                                    <span className="!inline-flex !items-center !gap-1 !rounded-full !px-2 !py-0.5 !text-xs !font-bold !bg-blue-100 dark:!bg-blue-900/30 !text-blue-700 dark:!text-blue-300 !border !border-blue-300 dark:!border-blue-700 !mr-1.5">
                                        <span className="!w-1.5 !h-1.5 !rounded-full !bg-blue-500" />Updated
                                    </span>
                                    shows only the fields that changed during that update event.
                                </p>
                                <p className="!mb-0">
                                    <span className="!inline-flex !items-center !gap-1 !rounded-full !px-2 !py-0.5 !text-xs !font-bold !bg-red-100 dark:!bg-red-900/30 !text-red-700 dark:!text-red-300 !border !border-red-300 dark:!border-red-800 !mr-1.5">
                                        <span className="!w-1.5 !h-1.5 !rounded-full !bg-red-500" />Deleted
                                    </span>
                                    displays the final entity snapshot captured at the moment the record was deleted.
                                </p>
                            </div>
                        </div>

                        <div className="!mt-3 !flex !items-start !gap-2.5 !rounded-xl !border !border-amber-200 dark:!border-amber-800 !bg-amber-50 dark:!bg-amber-900/20 !px-4 !py-3 !max-w-3xl">
                            <span className="!text-base !leading-none !mt-0.5">⚠️</span>
                            <p className="!text-xs !text-amber-800 dark:!text-amber-300 !leading-relaxed !mb-0">
                                <span className="!font-bold">NOTE:</span> Logs are grouped by entity and arranged chronologically. Each entity group is identified by a number shown beside the entity name, e.g.{" "}
                                <span className="!font-mono !font-bold !text-amber-900 dark:!text-amber-200">Patient #12</span>.
                                The <span className="!font-semibold">Created</span> log shows the full snapshot. Subsequent <span className="!font-semibold">Updated</span> logs show only what changed. For stock batches, quantity changes also show the numeric delta (+ addition / − reduction).
                            </p>
                        </div>
                    </div>

                    {meta && (
                        <div className="!flex !items-center !gap-2 !bg-indigo-50 dark:!bg-indigo-900/20 !border !border-indigo-200 dark:!border-indigo-800 !rounded-2xl !px-5 !py-2.5">
                            <span className="!text-3xl !font-black !text-indigo-600 dark:!text-indigo-400">{meta.total}</span>
                            <span className="!text-sm !text-indigo-500 dark:!text-indigo-300 !leading-tight">total<br />entries</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="!max-w-7xl !mx-auto !px-4 sm:!px-8 !py-6 !space-y-5">

                {/* filter panel */}
                <div className="!bg-white dark:!bg-gray-800 !rounded-2xl !border !border-gray-200 dark:!border-gray-700 !shadow-sm !p-5">
                    <h2 className="!text-xs !font-bold !text-gray-500 dark:!text-gray-400 !uppercase !tracking-widest !mb-4">
                        Filter Logs
                    </h2>

                    <div className="!grid !grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-3 !gap-4">

                        <div>
                            <label className="!block !text-xs !font-semibold !text-gray-500 dark:!text-gray-400 !uppercase !tracking-wider !mb-1">Date From</label>
                            <input type="date" value={filters.date_from || ""} max={filters.date_to}
                                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                                className="!w-full !bg-white dark:!bg-gray-700 !text-gray-900 dark:!text-white !border !border-gray-300 dark:!border-gray-600 !rounded-lg !px-3 !py-2 !text-sm focus:!outline-none focus:!ring-2 focus:!ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="!block !text-xs !font-semibold !text-gray-500 dark:!text-gray-400 !uppercase !tracking-wider !mb-1">Date To</label>
                            <input type="date" value={filters.date_to || ""} min={filters.date_from}
                                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                                className="!w-full !bg-white dark:!bg-gray-700 !text-gray-900 dark:!text-white !border !border-gray-300 dark:!border-gray-600 !rounded-lg !px-3 !py-2 !text-sm focus:!outline-none focus:!ring-2 focus:!ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="!block !text-xs !font-semibold !text-gray-500 dark:!text-gray-400 !uppercase !tracking-wider !mb-1">User</label>
                            <Select options={users} value={selUser} classNames={getSelectClassNames()}
                                placeholder="All Users" isClearable
                                onChange={(opt) => { setSelUser(opt); setFilters((f) => ({ ...f, user_id: opt ? opt.value : null })); }}
                            />
                        </div>

                        <div>
                            <label className="!block !text-xs !font-semibold !text-gray-500 dark:!text-gray-400 !uppercase !tracking-wider !mb-1">Entity</label>
                            <Select options={loggableModels} value={selModel} classNames={getSelectClassNames()}
                                placeholder="All entities" isClearable
                                onChange={(opt) => { setSelModel(opt); setFilters((f) => ({ ...f, model: opt ? opt.value : null })); }}
                            />
                        </div>

                        <div>
                            <label className="!block !text-xs !font-semibold !text-gray-500 dark:!text-gray-400 !uppercase !tracking-wider !mb-1">Branch</label>
                            <Select options={branches} value={selBranch} classNames={getSelectClassNames()}
                                placeholder="All Branches" isClearable
                                onChange={(opt) => { setSelBranch(opt); setFilters((f) => ({ ...f, branch_id: opt ? opt.value : null })); }}
                            />
                        </div>

                        <div>
                            <label className="!block !text-xs !font-semibold !text-gray-500 dark:!text-gray-400 !uppercase !tracking-wider !mb-1">Action</label>
                            <Select options={ACTION_OPTIONS} value={selAction} classNames={getSelectClassNames()}
                                placeholder="All Actions" isClearable
                                onChange={(opt) => { setSelAction(opt); setFilters((f) => ({ ...f, action: opt ? opt.value : null })); }}
                            />
                        </div>

                        <div>
                            <label className="!block !text-xs !font-semibold !text-gray-500 dark:!text-gray-400 !uppercase !tracking-wider !mb-1">Per Page</label>
                            <select value={filters.per_page}
                                onChange={(e) => setFilters((f) => ({ ...f, per_page: Number(e.target.value) }))}
                                className="!w-full !bg-white dark:!bg-gray-700 !text-gray-900 dark:!text-white !border !border-gray-300 dark:!border-gray-600 !rounded-lg !px-3 !py-2 !text-sm focus:!outline-none focus:!ring-2 focus:!ring-indigo-500"
                            >
                                {[5, 10, 20, 50, 100].map((n) => (
                                    <option key={n} value={n}>{n} per page</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="!flex !items-center !gap-3 !mt-5 !pt-4 !border-t !border-gray-100 dark:!border-gray-700">
                        <button onClick={handleReset}
                            className="!rounded-xl !px-4 !py-2.5 !text-sm !font-semibold !text-gray-600 dark:!text-gray-300 !bg-gray-100 dark:!bg-gray-700 hover:!bg-gray-200 dark:hover:!bg-gray-600 !border !border-gray-200 dark:!border-gray-600 !transition-all !duration-150">
                            Reset
                        </button>

                        <button onClick={handleExport} disabled={exporting || loading}
                            className="!flex !items-center !gap-2 !rounded-xl !px-4 !py-2.5 !text-sm !font-semibold !text-emerald-700 dark:!text-emerald-300 !bg-emerald-50 dark:!bg-emerald-900/20 hover:!bg-emerald-100 dark:hover:!bg-emerald-900/40 !border !border-emerald-300 dark:!border-emerald-700 disabled:!opacity-60 !transition-all !duration-150">
                            {exporting ? (
                                <><span className="!inline-block !w-4 !h-4 !border-2 !border-emerald-500 !border-t-transparent !rounded-full !animate-spin" />Exporting…</>
                            ) : (
                                <><svg className="!w-4 !h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>Export Excel</>
                            )}
                        </button>

                        <button onClick={() => fetchLogs(1)} disabled={loading}
                            className="!ms-auto !flex !items-center !gap-2 !rounded-xl !px-5 !py-2.5 !text-sm !font-bold !bg-indigo-600 hover:!bg-indigo-700 !text-white !shadow-sm disabled:!opacity-60 !transition-all !duration-150">
                            {loading ? (
                                <><span className="!inline-block !w-4 !h-4 !border-2 !border-white !border-t-transparent !rounded-full !animate-spin" />Fetching…</>
                            ) : "Apply Filters"}
                        </button>
                    </div>
                </div>

                {/* error */}
                {error && (
                    <div className="!rounded-xl !px-4 !py-3 !text-sm !font-semibold !text-red-600 dark:!text-red-400 !bg-red-50 dark:!bg-red-900/20 !border !border-red-200 dark:!border-red-800">
                        {error}
                    </div>
                )}

                {/* model summary strip */}
                {fetched && !loading && modelBreakdown.length > 0 && (
                    <div className="!flex !items-center !gap-2 !flex-wrap">
                        <span className="!text-xs !text-gray-400 dark:!text-gray-500 !uppercase !tracking-widest !font-semibold">Showing:</span>
                        {modelBreakdown.map(({ modelType, count }) => (
                            <span key={modelType} className="!inline-flex !items-center !gap-1.5 !rounded-full !bg-white dark:!bg-gray-800 !border !border-gray-200 dark:!border-gray-700 !px-3 !py-1 !text-xs !font-semibold !text-gray-700 dark:!text-gray-300 !shadow-sm">
                                {MODEL_ICONS[modelType] || "📋"} {modelType}
                                <span className="!text-indigo-600 dark:!text-indigo-400 !font-bold">&times;{count}</span>
                            </span>
                        ))}
                    </div>
                )}

                {/* loading */}
                {loading && (
                    <div className="!flex !justify-center !items-center !py-24">
                        <div className="!flex !flex-col !items-center !gap-3">
                            <div className="!w-10 !h-10 !border-4 !border-indigo-200 !border-t-indigo-600 !rounded-full !animate-spin" />
                            <p className="!text-sm !text-gray-400 dark:!text-gray-500">Loading logs…</p>
                        </div>
                    </div>
                )}

                {/* empty states */}
                {!loading && fetched && allEntries.length === 0 && (
                    <div className="!text-center !py-24">
                        <p className="!text-5xl !mb-3">🔍</p>
                        <p className="!text-lg !font-bold !text-gray-400 dark:!text-gray-500">No logs found</p>
                        <p className="!text-sm !text-gray-400 dark:!text-gray-600 !mt-1">Try adjusting your filters or expanding the date range</p>
                    </div>
                )}

                {!loading && !fetched && (
                    <div className="!text-center !py-24">
                        <p className="!text-5xl !mb-3">📋</p>
                        <p className="!text-lg !font-bold !text-gray-400 dark:!text-gray-500">Set filters and click Apply to view logs</p>
                    </div>
                )}

                {/* log cards */}
                {!loading && allEntries.length > 0 && (
                    <div className="!space-y-3">
                        {allEntries.map((entry) => (
                            <LogCard key={entry.id} entry={entry} />
                        ))}
                    </div>
                )}

                {/* pagination */}
                {meta && meta.last_page > 1 && (
                    <div className="!flex !items-center !justify-between !flex-wrap !gap-4 !pt-2">
                        <p className="!text-sm !text-gray-500 dark:!text-gray-400">
                            Page <strong className="!text-gray-700 dark:!text-gray-200">{meta.current_page}</strong> of{" "}
                            <strong className="!text-gray-700 dark:!text-gray-200">{meta.last_page}</strong> — {meta.total} total
                        </p>

                        <div className="!flex !items-center !gap-2">
                            <button disabled={meta.current_page <= 1 || loading} onClick={() => fetchLogs(meta.current_page - 1)}
                                className="!rounded-xl !px-4 !py-2 !text-sm !font-semibold !bg-white dark:!bg-gray-800 !text-gray-700 dark:!text-gray-300 !border !border-gray-200 dark:!border-gray-700 hover:!bg-gray-50 dark:hover:!bg-gray-700 disabled:!opacity-40 !transition-all">
                                Prev
                            </button>

                            {Array.from({ length: meta.last_page }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === meta.last_page || Math.abs(p - meta.current_page) <= 1)
                                .reduce((acc, p, idx, arr) => {
                                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((item, idx) =>
                                    item === "..." ? (
                                        <span key={"e" + idx} className="!px-2 !text-gray-400 !text-sm">…</span>
                                    ) : (
                                        <button key={item} onClick={() => fetchLogs(item)} disabled={loading}
                                            className={
                                                "!rounded-xl !w-9 !h-9 !text-sm !font-bold !border !transition-all " +
                                                (item === meta.current_page
                                                    ? "!bg-indigo-600 !text-white !border-indigo-600 !shadow-sm"
                                                    : "!bg-white dark:!bg-gray-800 !text-gray-700 dark:!text-gray-300 !border-gray-200 dark:!border-gray-700 hover:!bg-gray-50 dark:hover:!bg-gray-700")
                                            }>
                                            {item}
                                        </button>
                                    )
                                )}

                            <button disabled={meta.current_page >= meta.last_page || loading} onClick={() => fetchLogs(meta.current_page + 1)}
                                className="!rounded-xl !px-4 !py-2 !text-sm !font-semibold !bg-white dark:!bg-gray-800 !text-gray-700 dark:!text-gray-300 !border !border-gray-200 dark:!border-gray-700 hover:!bg-gray-50 dark:hover:!bg-gray-700 disabled:!opacity-40 !transition-all">
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
