import React, { useMemo } from 'react';
import BmiRangeLegend, { classifyBmi } from './BmiRangeLegend';

/**
 * BmiCalculatorPanel
 *
 * Displays a live BMI result derived from the parent's controlled
 * weight and standingHeight state. Does NOT own those values — the parent
 * passes them in and handles updates via onWeightChange / onHeightChange.
 *
 * Props:
 *   weight          {string|number}   Weight in kg
 *   standingHeight  {string|number}   Standing height in cm
 *   onWeightChange  {function}        Called when weight input changes
 *   onHeightChange  {function}        Called when height input changes
 *   disabled        {boolean}
 *   inputCls        {string}          Extra Tailwind classes for inputs
 */
export default function BmiCalculatorPanel({
    weight         = '',
    standingHeight = '',
    onWeightChange,
    onHeightChange,
    disabled   = false,
    inputCls   = '',
}) {
    // Live BMI computed from controlled props — no state needed.
    const bmi = useMemo(() => {
        const w = parseFloat(weight);
        const h = parseFloat(standingHeight);
        if (!w || !h || h === 0) return null;
        const hM = h / 100;
        return Math.round((w / (hM * hM)) * 100) / 100;
    }, [weight, standingHeight]);

    const base =
        'border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-full';
    const cls  = `${base} ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'} ${inputCls}`;

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                {/* Weight */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        Weight (kg)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={weight}
                        onChange={e => onWeightChange?.(e.target.value)}
                        disabled={disabled}
                        className={cls}
                        placeholder="e.g. 70"
                    />
                </div>

                {/* Standing Height */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        Standing Height (cm)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={standingHeight}
                        onChange={e => onHeightChange?.(e.target.value)}
                        disabled={disabled}
                        className={cls}
                        placeholder="e.g. 170"
                    />
                </div>
            </div>

            {/* Live BMI result */}
            {bmi !== null && (
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">BMI</span>
                    <span className="text-xl font-bold text-gray-800">{bmi}</span>
                </div>
            )}

            {/* Legend — highlights active category when BMI is known */}
            <BmiRangeLegend bmiValue={bmi} />
        </div>
    );
}
