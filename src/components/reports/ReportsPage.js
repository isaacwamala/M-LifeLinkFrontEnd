import React, { useState } from 'react';
import { BarChart3, Stethoscope, FlaskConical, Pill, Info } from 'lucide-react';
import { ReportsOverview }              from './ReportsOverview';
import { ReportsConsultationBreakdown } from './ReportsConsultationBreakdown';
import { ReportsLabBreakdown }          from './ReportsLabBreakdown';
import { ReportsPharmacyBreakdown }     from './ReportsPharmacyBreakdown';

const TABS = [
    { key: 'overview',      label: 'Overview',      icon: BarChart3   },
    { key: 'consultation',  label: 'Consultation',  icon: Stethoscope },
    { key: 'lab',           label: 'Laboratory',    icon: FlaskConical },
    { key: 'pharmacy',      label: 'Pharmacy',      icon: Pill        },
];

export function ReportsPage() {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

            {/* Shared header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-blue-600" />
                        <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">
                            Departments Financial Performance Report
                        </h1>
                    </div>
                    <div className="flex items-start gap-2 mt-1 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-sm">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                            This report shows how each department — Consultation, Laboratory, and Pharmacy —
                            has contributed financially over a selected period of time. Use the date filter on
                            each tab to narrow the period. Figures cover all recorded activity from the start
                            of clinic operations up to today unless a range is applied.
                        </span>
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
                <div className="flex items-stretch min-w-max px-4 gap-1 pt-3">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab content */}
            {activeTab === 'overview'     && <ReportsOverview />}
            {activeTab === 'consultation' && <ReportsConsultationBreakdown />}
            {activeTab === 'lab'          && <ReportsLabBreakdown />}
            {activeTab === 'pharmacy'     && <ReportsPharmacyBreakdown />}

        </div>
    );
}
