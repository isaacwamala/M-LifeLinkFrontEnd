// BMI RANGE CONFIGURATION DRAWER
// Lets an admin view and save the clinic-wide BMI thresholds.
// Upserts via PUT config/updateBmiRange (backend handles create-or-update).

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Scale, Info, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../general/constants';
import { updateBmiRangesCache } from './triage_widgets/BmiRangeLegend';

// WHO fallback defaults — shown when no row has been saved yet
const WHO_DEFAULTS = {
    underweight_max: 18.5,
    normal_max:      24.9,
    overweight_max:  29.9,
};

const inputCls =
    'w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white ' +
    'border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 ' +
    'focus:border-transparent focus:outline-none text-sm transition-all ' +
    'placeholder-gray-400 dark:placeholder-gray-500 [appearance:textfield] ' +
    '[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const inputErrCls =
    'w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white ' +
    'border border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400 ' +
    'focus:border-transparent focus:outline-none text-sm transition-all ' +
    'placeholder-gray-400 dark:placeholder-gray-500 [appearance:textfield] ' +
    '[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

// ─── Inline live-preview legend ───────────────────────────────────────────────
// Mirrors BmiRangeLegend's visual style but accepts ranges as a prop so it
// reflects unsaved edits in real time (BmiRangeLegend fetches its own ranges
// internally and cannot be driven by form state).
const CATEGORIES = [
    { key: 'underweight', label: 'Underweight', color: 'bg-blue-600 border-blue-700 text-white'        },
    { key: 'normal',      label: 'Normal',      color: 'bg-green-600 border-green-700 text-white'       },
    { key: 'overweight',  label: 'Overweight',  color: 'bg-yellow-500 border-yellow-600 text-gray-900'  },
    { key: 'obese',       label: 'Obese',       color: 'bg-red-600 border-red-700 text-white'           },
];

function RangePreview({ ranges }) {
    const labels = {
        underweight: `≤ ${ranges.underweight_max}`,
        normal:      `${ranges.underweight_max} – ${ranges.normal_max}`,
        overweight:  `${ranges.normal_max} – ${ranges.overweight_max}`,
        obese:       `> ${ranges.overweight_max}`,
    };
    return (
        <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
                <div
                    key={cat.key}
                    className={`border-2 rounded px-2.5 py-1.5 text-xs font-bold opacity-90 ${cat.color}`}
                >
                    <div className="font-bold">{cat.label}</div>
                    <div className="text-[10px] font-medium opacity-90">{labels[cat.key]}</div>
                </div>
            ))}
        </div>
    );
}

// ─── Single numeric field ──────────────────────────────────────────────────────
function RangeField({ label, hint, value, onChange, error }) {
    return (
        <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">
                {label} <span className="text-red-500">*</span>
            </label>
            <input
                type="number"
                step="0.01"
                min="0.01"
                value={value}
                onChange={onChange}
                className={error ? inputErrCls : inputCls}
            />
            {hint && !error && (
                <p className="mt-1 text-[11px] italic text-gray-400 dark:text-gray-500">{hint}</p>
            )}
            {error && (
                <p className="mt-1 text-[11px] text-red-500 font-medium">{error}</p>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
//  BMIRanges
//  Props:
//    isOpen    – boolean
//    onClose   – () => void
//    token     – JWT string
//    onSuccess – () => void  (optional, called after successful save)
// ══════════════════════════════════════════════════════════════════════════════
export function BMIRanges({ isOpen, onClose, token, onSuccess }) {
    const [fetching, setFetching]     = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isNew, setIsNew]           = useState(false); // true when no row exists yet

    const [form, setForm] = useState({
        underweight_max: '',
        normal_max:      '',
        overweight_max:  '',
    });

    // ── Client-side validation errors ─────────────────────────────────────────
    const [errors, setErrors] = useState({});

    const validate = (f = form) => {
        const errs = {};
        const uw = parseFloat(f.underweight_max);
        const nm = parseFloat(f.normal_max);
        const ow = parseFloat(f.overweight_max);

        if (!f.underweight_max || isNaN(uw) || uw <= 0)
            errs.underweight_max = 'Must be a positive number.';

        if (!f.normal_max || isNaN(nm) || nm <= 0)
            errs.normal_max = 'Must be a positive number.';
        else if (!isNaN(uw) && nm <= uw)
            errs.normal_max = 'Must be greater than Underweight Max.';

        if (!f.overweight_max || isNaN(ow) || ow <= 0)
            errs.overweight_max = 'Must be a positive number.';
        else if (!isNaN(nm) && ow <= nm)
            errs.overweight_max = 'Must be greater than Normal Max.';

        return errs;
    };

    const isValid = Object.keys(validate()).length === 0;

    // ── Fetch current ranges whenever the drawer opens ─────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        setErrors({});
        setFetching(true);

        axios
            .get(`${API_BASE_URL}config/getBmiRange`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            })
            .then(res => {
                const data = res.data?.data;
                if (data) {
                    setIsNew(false);
                    setForm({
                        underweight_max: String(data.underweight_max),
                        normal_max:      String(data.normal_max),
                        overweight_max:  String(data.overweight_max),
                    });
                } else {
                    // No row yet — pre-fill WHO defaults and show the info banner
                    setIsNew(true);
                    setForm({
                        underweight_max: String(WHO_DEFAULTS.underweight_max),
                        normal_max:      String(WHO_DEFAULTS.normal_max),
                        overweight_max:  String(WHO_DEFAULTS.overweight_max),
                    });
                }
            })
            .catch(() => {
                // Fall back to WHO defaults silently
                setIsNew(true);
                setForm({
                    underweight_max: String(WHO_DEFAULTS.underweight_max),
                    normal_max:      String(WHO_DEFAULTS.normal_max),
                    overweight_max:  String(WHO_DEFAULTS.overweight_max),
                });
            })
            .finally(() => setFetching(false));
    }, [isOpen, token]);

    // ── Field change handler — also runs live validation ──────────────────────
    const handleChange = field => e => {
        const updated = { ...form, [field]: e.target.value };
        setForm(updated);
        setErrors(validate(updated));
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setSubmitting(true);
        try {
            const res = await axios.put(
                `${API_BASE_URL}config/updateBmiRange`,
                {
                    underweight_max: parseFloat(form.underweight_max),
                    normal_max:      parseFloat(form.normal_max),
                    overweight_max:  parseFloat(form.overweight_max),
                },
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
            );
            // Push the freshly-saved ranges to every currently-mounted BmiRangeLegend instance
            // so open triage drawers / calculator panels update immediately without a page reload.
            const saved = res.data?.data;
            if (saved) updateBmiRangesCache(saved);
            toast.success('BMI ranges saved successfully');
            onSuccess?.();
            onClose();
        } catch (err) {
            if (err.response?.status === 403) {
                toast.error('Only administrators can update BMI ranges.');
            } else {
                toast.error(err.response?.data?.message || 'Failed to save BMI ranges');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ── Live-preview ranges for BmiRangeLegend ────────────────────────────────
    // Pass the in-progress form values so the legend reflects unsaved edits.
    const previewRanges = {
        underweight_max: parseFloat(form.underweight_max) || WHO_DEFAULTS.underweight_max,
        normal_max:      parseFloat(form.normal_max)      || WHO_DEFAULTS.normal_max,
        overweight_max:  parseFloat(form.overweight_max)  || WHO_DEFAULTS.overweight_max,
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Panel — slides in from right */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col bg-white dark:bg-gray-900 shadow-2xl">

                {/* ── Gradient header ── */}
                <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-5 flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                <Scale className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-base leading-tight">
                                    BMI Range Configuration
                                </h2>
                                <p className="text-teal-100 text-xs mt-0.5">
                                    Set the thresholds used to classify patient BMI results clinic-wide
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/70 hover:text-white transition-colors mt-0.5"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {fetching ? (
                        /* Skeleton while fetching */
                        <div className="space-y-4 animate-pulse">
                            {[1, 2, 3].map(i => (
                                <div key={i}>
                                    <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* WHO-defaults info banner — shown only when no row exists yet */}
                            {isNew && (
                                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
                                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                        No custom BMI ranges have been set yet — these are the WHO default values.
                                        Save to apply them as your clinic's active ranges.
                                    </p>
                                </div>
                            )}

                            {/* ── Input fields ── */}
                            <RangeField
                                label="Underweight Max"
                                hint="BMI at or below this value is classified as Underweight"
                                value={form.underweight_max}
                                onChange={handleChange('underweight_max')}
                                error={errors.underweight_max}
                            />

                            <RangeField
                                label="Normal Max"
                                hint="BMI above Underweight Max and at or below this value is classified as Normal"
                                value={form.normal_max}
                                onChange={handleChange('normal_max')}
                                error={errors.normal_max}
                            />

                            <RangeField
                                label="Overweight Max"
                                hint="BMI above Normal Max and at or below this value is classified as Overweight; anything higher is Obese"
                                value={form.overweight_max}
                                onChange={handleChange('overweight_max')}
                                error={errors.overweight_max}
                            />

                            {/* ── Live legend preview ── */}
                            <div>
                                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                                    Live Preview
                                </p>
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                    <RangePreview ranges={previewRanges} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3 bg-white dark:bg-gray-900">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300
                            bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                            transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || fetching || !isValid}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                            text-white bg-gradient-to-r from-teal-600 to-emerald-600
                            hover:from-teal-700 hover:to-emerald-700
                            disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-teal-200 dark:shadow-teal-900/40"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {submitting ? 'Saving…' : 'Save Ranges'}
                    </button>
                </div>
            </div>
        </>
    );
}
