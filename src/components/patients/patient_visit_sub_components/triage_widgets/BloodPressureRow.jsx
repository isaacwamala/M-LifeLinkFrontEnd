import React from 'react';
import SegmentedDigitInput from './SegmentedDigitInput';

/**
 * BloodPressureRow
 *
 * Two SegmentedDigitInputs joined by "/" for systolic/diastolic.
 * Output format: "120.00/80.00"
 *
 * Props:
 *   value     {string}   e.g. "120.00/80.00" or ""
 *   onChange  {function} called with new string
 *   disabled  {boolean}
 */
export default function BloodPressureRow({ value = '', onChange, disabled = false }) {
    // Split on '/' — always produce two parts even when value is empty or partial
    const slashIdx   = value ? value.indexOf('/') : -1;
    const systolic   = slashIdx >= 0 ? value.slice(0, slashIdx)      : '';
    const diastolic  = slashIdx >= 0 ? value.slice(slashIdx + 1)     : '';

    function handleChange(part, newVal) {
        const sys = part === 'sys' ? newVal : systolic;
        const dia = part === 'dia' ? newVal : diastolic;
        // Only emit a non-empty string when at least one side has a value
        onChange(sys || dia ? `${sys}/${dia}` : '');
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Systolic — full [_][_][_].[_][_] */}
            <SegmentedDigitInput
                value={systolic}
                onChange={v => handleChange('sys', v)}
                disabled={disabled}
            />
            <span className="text-gray-500 dark:text-gray-400 font-bold text-lg leading-none">/</span>
            {/* Diastolic — full [_][_][_].[_][_] */}
            <SegmentedDigitInput
                value={diastolic}
                onChange={v => handleChange('dia', v)}
                disabled={disabled}
            />
            <span className="text-xs text-gray-400 dark:text-gray-500">mmHg</span>
        </div>
    );
}
