import React from 'react';
import SegmentedDigitInput from './SegmentedDigitInput';

/**
 * PulseRateRow
 *
 * A single SegmentedDigitInput for one pulse rate reading.
 * Output format: decimal string, e.g. "72.00"
 *
 * Props:
 *   value     {string}   e.g. "72.00" or ""
 *   onChange  {function} called with new decimal string
 *   disabled  {boolean}
 */
export default function PulseRateRow({ value = '', onChange, disabled = false }) {
    return (
        <div className="flex items-center gap-2">
            <SegmentedDigitInput
                value={value}
                onChange={onChange}
                disabled={disabled}
            />
            <span className="text-xs text-gray-400">bpm</span>
        </div>
    );
}
