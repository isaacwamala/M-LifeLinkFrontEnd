import React from 'react';
import SegmentedDigitInput from './SegmentedDigitInput';

const METHODS = [
    { value: 'axillary',  label: 'Axillary'  },
    { value: 'oral',      label: 'Oral'       },
    { value: 'rectal',    label: 'Rectal'     },
    { value: 'tympanic',  label: 'Tympanic'   },
    { value: 'skin',      label: 'Skin'       },
    { value: 'temporal',  label: 'Temporal'   },
];

const selectCls =
    'border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white';

/**
 * TemperatureRow
 *
 * Method <select> + SegmentedDigitInput for one temperature reading.
 * Output format: { value: "36.50", method: "axillary" }
 *
 * Props:
 *   value     {{ value: string, method: string }}  Controlled object or {}
 *   onChange  {function}                           Called with updated object
 *   disabled  {boolean}
 */
export default function TemperatureRow({ value = {}, onChange, disabled = false }) {
    const tempVal  = value?.value  ?? '';
    const method   = value?.method ?? 'axillary';

    function handleChange(field, newVal) {
        onChange({ value: tempVal, method, [field]: newVal });
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <select
                value={method}
                onChange={e => handleChange('method', e.target.value)}
                disabled={disabled}
                className={selectCls}
            >
                {METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                ))}
            </select>

            <SegmentedDigitInput
                value={tempVal}
                onChange={v => handleChange('value', v)}
                disabled={disabled}
            />
            <span className="text-xs text-gray-400">°C</span>
        </div>
    );
}
