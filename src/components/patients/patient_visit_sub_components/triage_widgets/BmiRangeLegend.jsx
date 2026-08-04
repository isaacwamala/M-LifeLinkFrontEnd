import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../../../general/constants';

// Module-level cache + subscriber list.
// _cachedRanges holds the last-known ranges (null until first fetch).
// _subscribers is the set of every currently-mounted instance's setRanges setter.
// Call updateBmiRangesCache() after saving new ranges to push them to all live instances
// instantly, without a page reload.
let _cachedRanges = null;
const _subscribers = new Set();

/**
 * Update the shared BMI-range cache and push the new values to every currently-mounted
 * BmiRangeLegend instance. Call this from the save handler in BMIRanges.js (or anywhere
 * else that persists new range thresholds) so open legends re-render immediately.
 */
export function updateBmiRangesCache(newRanges) {
    _cachedRanges = newRanges;
    _subscribers.forEach(setter => setter(newRanges));
}

const WHO_DEFAULTS = {
    underweight_max: 18.49,
    normal_max:      24.99,
    overweight_max:  29.99,
};

const CATEGORIES = [
    { key: 'underweight', label: 'Underweight', color: 'bg-blue-600 border-blue-700 text-white'         },
    { key: 'normal',      label: 'Normal',      color: 'bg-green-600 border-green-700 text-white'        },
    { key: 'overweight',  label: 'Overweight',  color: 'bg-yellow-500 border-yellow-600 text-gray-900'   },
    { key: 'obese',       label: 'Obese',       color: 'bg-red-600 border-red-700 text-white'            },
];

/**
 * Determine which BMI category a value falls into, given threshold ranges.
 * Exported so other components (PatientVisit, PatientTriagesHistory) can use
 * the same colour mapping without duplicating the logic.
 *
 * @param  {number|string} bmiValue
 * @param  {object}        ranges    { underweight_max, normal_max, overweight_max }
 * @returns {string}                 'underweight' | 'normal' | 'overweight' | 'obese'
 */
export function classifyBmi(bmiValue, ranges = WHO_DEFAULTS) {
    const bmi = parseFloat(bmiValue);
    if (isNaN(bmi)) return null;
    const r = { ...WHO_DEFAULTS, ...ranges };
    if (bmi <= r.underweight_max) return 'underweight';
    if (bmi <= r.normal_max)      return 'normal';
    if (bmi <= r.overweight_max)  return 'overweight';
    return 'obese';
}

/** Return the Tailwind classes for a given category key. */
export function categoryColor(key) {
    return CATEGORIES.find(c => c.key === key)?.color ?? '';
}

/**
 * BmiRangeLegend
 *
 * Fetches BMI range thresholds once (module-level cache), renders 4 coloured
 * boxes showing the configured ranges, and highlights the matching box when
 * a `bmiValue` prop is provided.
 *
 * Props:
 *   bmiValue  {number|string|null}  Active BMI to highlight (optional)
 */
export default function BmiRangeLegend({ bmiValue = null }) {
    const [ranges, setRanges]   = useState(_cachedRanges ?? WHO_DEFAULTS);
    const [loading, setLoading] = useState(!_cachedRanges);

    // Subscribe this instance so it receives live updates when updateBmiRangesCache() is called
    // (e.g. after an admin saves new thresholds in the BMIRanges config drawer).
    useEffect(() => {
        _subscribers.add(setRanges);
        return () => _subscribers.delete(setRanges);
    }, []);

    // Fetch from the API once per page load. If the cache is already populated (another instance
    // fetched first, or updateBmiRangesCache was called), skip the network request entirely.
    useEffect(() => {
        if (_cachedRanges) { setLoading(false); return; }

        const token = localStorage.getItem('access_token');

        axios.get(`${API_BASE_URL}config/getBmiRange`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(res => {
                const data = res.data?.data ?? res.data;
                if (data) {
                    const normalized = {
                        ...data,
                        underweight_max: parseFloat(data.underweight_max),
                        normal_max:      parseFloat(data.normal_max),
                        overweight_max:  parseFloat(data.overweight_max),
                    };
                    updateBmiRangesCache(normalized); // populates cache AND notifies all subscribers
                }
            })
            .catch((err) => {
                console.error('BmiRangeLegend: failed to fetch BMI ranges, falling back to WHO defaults', err);
            })
            .finally(() => setLoading(false));
    }, []);

    const activeCategory = bmiValue != null ? classifyBmi(bmiValue, ranges) : null;

    // Build label strings from thresholds
    const labels = {
        underweight: `< ${ranges.underweight_max}`,
        normal:      `${ranges.underweight_max} – ${ranges.normal_max}`,
        overweight:  `${ranges.normal_max} – ${ranges.overweight_max}`,
        obese:       `> ${ranges.overweight_max}`,
    };

    return (
        <div className="mt-2">
            {loading && (
                <p className="text-xs text-gray-400 italic mb-1">Loading BMI ranges…</p>
            )}
            <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                    const isActive = cat.key === activeCategory;
                    return (
                        <div
                            key={cat.key}
                            className={`
                                relative border-2 rounded px-2.5 py-1.5 text-xs font-bold transition-all
                                ${cat.color}
                                ${isActive
                                    ? 'ring-4 ring-gray-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-105 shadow-lg'
                                    : 'opacity-80'}
                            `}
                        >
                            {isActive && (
                                <CheckCircle2 className="absolute -top-2 -right-2 w-4 h-4 text-gray-900 dark:text-white bg-white dark:bg-gray-900 rounded-full" />
                            )}
                            <div className="font-bold">{cat.label}</div>
                            <div className="text-[10px] font-medium opacity-90">{labels[cat.key]}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
