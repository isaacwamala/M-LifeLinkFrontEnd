import React, { useRef } from 'react';

/**
 * SegmentedDigitInput
 *
 * A 5-box numeric input: [_][_][_] . [_][_]
 * Slot layout: [int1][int2][int3] . [dec1][dec2]
 *
 * Props:
 *   value     {string}   Controlled decimal string, e.g. "45.90" or ""
 *   onChange  {function} Called with the new decimal string on each keystroke
 *   disabled  {boolean}
 *   inputCls  {string}   Extra Tailwind classes for each box
 */

const SLOT_COUNT = 5; // 3 integer digits + 2 decimal digits

/** Convert a decimal string like "45.9" → ['','','4','5','9','0'] (5 slots) */
function parseValue(val) {
    if (!val && val !== 0) return Array(SLOT_COUNT).fill('');
    const str  = String(val).trim();
    const parts = str.split('.');
    const intRaw = (parts[0] || '').replace(/\D/g, '').slice(-3); // up to 3 integer digits

    // Pad integer part to 3 slots (right-aligned, empty on left)
    const intSlots = intRaw.padStart(3, ' ').split('').map(c => c === ' ' ? '' : c);

    // Always produce exactly 2 decimal slots — padEnd('') doesn't fill, so index manually
    const decRaw = (parts[1] || '').replace(/\D/g, '');
    const decSlots = [decRaw[0] ?? '', decRaw[1] ?? ''];

    return [...intSlots, ...decSlots]; // always 5 elements
}

/** Convert 5 slots back to decimal string like "45.90". Returns "" if all empty. */
function buildValue(slots) {
    const intPart = slots.slice(0, 3).join('').replace(/^\s+/, ''); // strip leading spaces
    const decPart = slots.slice(3).join('');
    if (!intPart && !decPart) return '';
    return `${intPart || '0'}.${decPart.padEnd(2, '0')}`;
}

export default function SegmentedDigitInput({ value, onChange, disabled = false, inputCls = '' }) {
    const slots = parseValue(value);
    // Fixed-count refs — always exactly SLOT_COUNT, satisfying rules-of-hooks
    const r0 = useRef(); const r1 = useRef(); const r2 = useRef();
    const r3 = useRef(); const r4 = useRef();
    const refs = [r0, r1, r2, r3, r4];

    function handleKeyDown(e, idx) {
        const { key } = e;

        if (key === 'Backspace') {
            e.preventDefault();
            const next = [...slots];
            if (next[idx] !== '') {
                next[idx] = '';
            } else if (idx > 0) {
                next[idx - 1] = '';
                refs[idx - 1].current?.focus();
            }
            onChange(buildValue(next));
            return;
        }

        if (key === 'ArrowLeft' && idx > 0) {
            e.preventDefault();
            refs[idx - 1].current?.focus();
            return;
        }

        if (key === 'ArrowRight' && idx < SLOT_COUNT - 1) {
            e.preventDefault();
            refs[idx + 1].current?.focus();
            return;
        }

        if (/^[0-9]$/.test(key)) {
            e.preventDefault();
            const next = [...slots];
            next[idx] = key;
            onChange(buildValue(next));
            // Auto-advance
            if (idx < SLOT_COUNT - 1) refs[idx + 1].current?.focus();
        }
    }

    const baseBox =
        'w-8 h-9 text-center border border-gray-200 dark:border-gray-700 rounded ' +
        'focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono text-sm transition-colors';

    return (
        <span className="inline-flex items-center gap-0.5 select-none">
            {refs.map((ref, i) => (
                <React.Fragment key={i}>
                    {i === 3 && (
                        <span className="text-gray-500 dark:text-gray-400 font-bold mx-0.5">.</span>
                    )}
                    <input
                        ref={ref}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        disabled={disabled}
                        value={slots[i]}
                        readOnly
                        onKeyDown={e => handleKeyDown(e, i)}
                        onFocus={e => e.target.select()}
                        className={`${baseBox} ${
                            disabled
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white'
                        } ${inputCls}`}
                    />
                </React.Fragment>
            ))}
        </span>
    );
}
