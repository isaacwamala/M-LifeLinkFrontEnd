import React from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

/**
 * MultiReadingField
 *
 * Generic render-prop wrapper for repeatable vital readings.
 * Manages a local `readings` array; delegates row rendering to parent.
 *
 * Props:
 *   readings     {Array}    Current list of reading values (controlled)
 *   onAdd        {function} Called with no args — parent should push a new blank entry
 *   onRemove     {function(index)} Called when the user removes a row
 *   renderRow    {function(reading, index)} Render prop — returns JSX for one row
 *   addLabel     {string}   Button label (default "Add reading")
 *   maxReadings  {number}   Hide Add button when length reaches this (default 5)
 *   disabled     {boolean}
 */
export default function MultiReadingField({
    readings    = [],
    onAdd,
    onRemove,
    renderRow,
    addLabel    = 'Add reading',
    maxReadings = 5,
    disabled    = false,
}) {
    // Guard against non-array values (e.g. stale string state during hot-reload)
    const safeReadings = Array.isArray(readings) ? readings : [];

    return (
        <div className="space-y-2">
            {safeReadings.map((reading, idx) => (
                <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">{renderRow(reading, idx)}</div>

                    {!disabled && safeReadings.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onRemove(idx)}
                            className="text-rose-400 hover:text-rose-600 transition-colors shrink-0"
                            title="Remove this reading"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            ))}

            {!disabled && safeReadings.length < maxReadings && (
                <button
                    type="button"
                    onClick={onAdd}
                    className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-700 font-medium transition-colors"
                >
                    <PlusCircle size={15} />
                    {addLabel}
                </button>
            )}

            {safeReadings.length === 0 && (
                <p className="text-xs text-gray-400 italic">No readings yet. Click "{addLabel}" to add one.</p>
            )}
        </div>
    );
}
