/**
 * Returns classNames config for react-select that matches the app's
 * Tailwind dark/light styling used across all search selects.
 */
export function getSelectClassNames() {
    return {
        control: (state) =>
            "!min-h-[38px] !rounded-lg !border !text-sm !shadow-none !transition-all " +
            (state.isFocused
                ? "!border-indigo-500 !ring-2 !ring-indigo-500/20 !bg-white dark:!bg-gray-700"
                : "!border-gray-300 dark:!border-gray-600 !bg-white dark:!bg-gray-700"),
        placeholder: () => "!text-gray-400 dark:!text-gray-500 !text-sm",
        singleValue: () => "!text-gray-900 dark:!text-white !text-sm",
        input: () => "!text-gray-900 dark:!text-white !text-sm",
        menu: () =>
            "!rounded-lg !border !border-gray-200 dark:!border-gray-600 !shadow-lg !bg-white dark:!bg-gray-800 !z-50",
        option: (state) =>
            "!text-sm !px-3 !py-2 !cursor-pointer " +
            (state.isSelected
                ? "!bg-indigo-600 !text-white"
                : state.isFocused
                    ? "!bg-gray-100 dark:!bg-gray-700 !text-gray-900 dark:!text-white"
                    : "!text-gray-700 dark:!text-gray-300"),
        clearIndicator: () => "!text-gray-400 hover:!text-gray-600 dark:hover:!text-gray-300 !cursor-pointer",
        dropdownIndicator: () => "!text-gray-400 dark:!text-gray-500",
        indicatorSeparator: () => "!bg-gray-200 dark:!bg-gray-600",
        valueContainer: () => "!px-3",
        multiValue: () => "!bg-indigo-100 dark:!bg-indigo-900/40 !rounded",
        multiValueLabel: () => "!text-indigo-800 dark:!text-indigo-300 !text-xs !px-1",
        multiValueRemove: () =>
            "!text-indigo-500 hover:!bg-indigo-200 dark:hover:!bg-indigo-800 !rounded-r !px-1",
    };
}
